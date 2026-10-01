import {
  AdaptiveDpr,
  CameraControls,
  CameraControlsImpl,
  Center,
  Environment,
  OrthographicCamera,
  Grid,
  Lightformer,
  PerformanceMonitor,
  PerspectiveCamera,
  PointerLockControls,
  Preload,
  useAnimations,
  useGLTF,
  useProgress,
} from "@react-three/drei";
import { Canvas, createPortal, useFrame, useThree, type ComputeFunction } from "@react-three/fiber";
import {
  Camera,
  Box,
  ListTree,
  Check,
  ChevronDown,
  Copy,
  Download,
  Footprints,
  Gauge,
  Grid2X2,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  Play,
  Rotate3D,
  RotateCcw,
  ScanSearch,
  Sun,
} from "lucide-react";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type ReactNode,
} from "react";
import {
  LoopOnce,
  LoopRepeat,
  MeshStandardMaterial,
  MeshBasicMaterial,
  MeshNormalMaterial,
  type Mesh,
  Scene,
  Vector3,
  type Group,
  type Object3D,
  type PerspectiveCamera as ThreePerspectiveCamera,
  type OrthographicCamera as ThreeOrthographicCamera,
} from "three";
import { inspectModel, frameBounds, prepareAnimationBounds, type ModelInspection } from "./model-inspection";
import type { GLTFLoader } from "three-stdlib";
import { clone } from "three/addons/utils/SkeletonUtils.js";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { ViewerControlButton as Button, ViewerUiProvider, type ViewerUiComponents } from "./viewer-ui";
import { ModelInspector } from "./model-inspector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ViewCube, type ViewCubePosition } from "./view-cube";
import "./model-viewer.css";

export type ViewerMode = "orbit" | "split" | "firstPerson";
export type ViewerLighting = "day" | "night";
export type ViewerShading = "realistic" | "solid" | "normals" | "wireframe";
export type ViewerViewCube = "drei" | "asset-studio";
export type ViewerCameraPreset = "isometric" | "front" | "right" | "back" | "left" | "top" | "bottom";

export type ViewerCameraState = {
  position: [number, number, number];
  target: [number, number, number];
};

export type ViewerProgress = {
  active: boolean;
  progress: number;
  item: string;
  loaded: number;
  total: number;
};

export interface ModelViewerProps {
  components?: Partial<ViewerUiComponents>;
  src?: string;
  alt?: string;
  className?: string;
  height?: CSSProperties["height"];
  mode?: ViewerMode;
  defaultMode?: ViewerMode;
  onModeChange?: (mode: ViewerMode) => void;
  lighting?: ViewerLighting;
  defaultLighting?: ViewerLighting;
  onLightingChange?: (lighting: ViewerLighting) => void;
  shading?: ViewerShading;
  defaultShading?: ViewerShading;
  onShadingChange?: (shading: ViewerShading) => void;
  showGrid?: boolean;
  defaultShowGrid?: boolean;
  onGridChange?: (visible: boolean) => void;
  showCubes?: boolean;
  showUi?: boolean;
  showOrientation?: boolean;
  viewCube?: ViewerViewCube | false;
  defaultViewCube?: ViewerViewCube | false;
  viewCubePosition?: ViewCubePosition;
  viewCubeMargin?: [number, number];
  onViewCubeChange?: (value: ViewerViewCube | false) => void;
  projection?: "perspective" | "orthographic";
  defaultProjection?: "perspective" | "orthographic";
  onProjectionChange?: (projection: "perspective" | "orthographic") => void;
  showInspector?: boolean;
  onInspect?: (inspection: ModelInspection) => void;
  showAnimationControls?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  cameraPreset?: ViewerCameraPreset;
  defaultCameraPreset?: ViewerCameraPreset;
  onCameraPresetChange?: (preset: ViewerCameraPreset) => void;
  onCameraChange?: (state: ViewerCameraState) => void;
  animation?: string | null;
  defaultAnimation?: string | null;
  onAnimationChange?: (animation: string | null) => void;
  animationPlaying?: boolean;
  defaultAnimationPlaying?: boolean;
  onAnimationPlayingChange?: (playing: boolean) => void;
  animationSpeed?: number;
  defaultAnimationSpeed?: number;
  onAnimationSpeedChange?: (speed: number) => void;
  loopAnimation?: boolean;
  environment?: boolean;
  poster?: string;
  loadingFallback?: ReactNode | ((progress: ViewerProgress) => ReactNode);
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
  overlay?: ReactNode;
  useDraco?: boolean | string;
  useMeshopt?: boolean;
  extendLoader?: (loader: GLTFLoader) => void;
  clearCacheOnUnmount?: boolean;
  respectReducedMotion?: boolean;
  onPerformanceChange?: (factor: number) => void;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

type ViewFace = "front" | "right" | "back" | "left";

type Pane = {
  face?: ViewFace;
  label?: string;
};

const splitPanes: Pane[] = [
  { face: "front", label: "Front" },
  { face: "right", label: "Right" },
  { face: "back", label: "Back" },
  { face: "left", label: "Left" },
];

const animationSpeeds = [0.5, 1, 1.5, 2];

const presetVectors: Record<ViewerCameraPreset, [number, number, number]> = {
  isometric: [1.7, 1.15, 1.7],
  front: [0, 0, 1],
  right: [1, 0, 0],
  back: [0, 0, -1],
  left: [-1, 0, 0],
  top: [0.001, 1, 0.001],
  bottom: [0.001, -1, 0.001],
};

class ViewerErrorBoundary extends Component<
  { children: ReactNode; fallback?: ModelViewerProps["errorFallback"]; onError?: (error: Error) => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { this.props.onError?.(error); }
  render() {
    if (!this.state.error) return this.props.children;
    const custom = typeof this.props.fallback === "function" ? this.props.fallback(this.state.error) : this.props.fallback;
    return (
      <div className="viewer-error-wrap">
        {custom ?? <Alert><AlertDescription>Could not display this model: {this.state.error.message}</AlertDescription></Alert>}
      </div>
    );
  }
}

export function ModelViewer({
  components,
  src,
  alt = "3D model",
  className,
  height = 620,
  mode: controlledMode,
  defaultMode = "orbit",
  onModeChange,
  lighting: controlledLighting,
  defaultLighting = "day",
  onLightingChange,
  shading: controlledShading,
  defaultShading = "realistic",
  onShadingChange,
  showGrid: controlledGrid,
  defaultShowGrid = false,
  onGridChange,
  showCubes: requestedCubes,
  showUi = true,
  showOrientation = showUi,
  viewCube: controlledViewCube,
  defaultViewCube = "asset-studio",
  viewCubePosition = "top-right",
  viewCubeMargin,
  onViewCubeChange,
  projection: controlledProjection,
  defaultProjection = "perspective",
  onProjectionChange,
  showInspector = false,
  onInspect,
  showAnimationControls = true,
  autoRotate = false,
  autoRotateSpeed = 0.15,
  cameraPreset: controlledCameraPreset,
  defaultCameraPreset = "isometric",
  onCameraPresetChange,
  onCameraChange,
  animation: controlledAnimation,
  defaultAnimation = null,
  onAnimationChange,
  animationPlaying: controlledAnimationPlaying,
  defaultAnimationPlaying = false,
  onAnimationPlayingChange,
  animationSpeed: controlledAnimationSpeed,
  defaultAnimationSpeed = 1,
  onAnimationSpeedChange,
  loopAnimation = true,
  environment = true,
  poster,
  loadingFallback,
  errorFallback,
  overlay,
  useDraco = true,
  useMeshopt = true,
  extendLoader,
  clearCacheOnUnmount = src?.startsWith("blob:") ?? false,
  respectReducedMotion = true,
  onPerformanceChange,
  onLoad,
  onError,
}: ModelViewerProps) {
  const [mode, setMode] = useControlledState(controlledMode, defaultMode, onModeChange);
  const [viewCube, setViewCube] = useControlledState(controlledViewCube, defaultViewCube, onViewCubeChange);
  const [projection, setProjection] = useControlledState(controlledProjection, defaultProjection, onProjectionChange);
  const [inspectorOpen, setInspectorOpen] = useState(showInspector);
  const [inspection, setInspection] = useState<ModelInspection | null>(null);
  const [selectedMesh, setSelectedMesh] = useState<string | null>(null);
  const [quality, setQuality] = useState(1.5);
  const [lighting, setLighting] = useControlledState(controlledLighting, defaultLighting, onLightingChange);
  const [shading, setShading] = useControlledState(controlledShading, defaultShading, onShadingChange);
  const [grid, setGrid] = useControlledState(controlledGrid, defaultShowGrid, onGridChange);
  const [cameraPreset] = useControlledState(controlledCameraPreset, defaultCameraPreset, onCameraPresetChange);
  const [animation, setAnimation] = useControlledState<string | null>(controlledAnimation, defaultAnimation, onAnimationChange);
  const [animationPlaying, setAnimationPlaying] = useControlledState(controlledAnimationPlaying, defaultAnimationPlaying, onAnimationPlayingChange);
  const [animationSpeed, setAnimationSpeed] = useControlledState(controlledAnimationSpeed, defaultAnimationSpeed, onAnimationSpeedChange);
  const [animationNames, setAnimationNames] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(!src);
  const [viewerError, setViewerError] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pointerLockAvailable, setPointerLockAvailable] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const [animationResetToken, setAnimationResetToken] = useState(0);
  const [readyPanes, setReadyPanes] = useState<Set<number>>(() => new Set());
  const reducedMotion = useReducedMotion(respectReducedMotion);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadReported = useRef(false);
  const viewerKey = useId();
  const cubes = requestedCubes ?? !src;
  const expectedPanes = mode === "split" ? splitPanes.length : 1;
  const effectiveAutoRotate = autoRotate && !reducedMotion && mode === "orbit";
  const effectiveAnimationPlaying = animationPlaying && !reducedMotion;
  const panes = mode === "split" ? splitPanes : [{}];
  const paneTracks = useRef(Array.from({ length: splitPanes.length }, () => ({ current: null as HTMLDivElement | null }))).current;

  useEffect(() => {
    setLoaded(!src);
    setViewerError(false);
    setFeedback(null);
    setReadyPanes(new Set());
    setAnimationNames([]);
    loadReported.current = false;
    return () => {
      if (src && clearCacheOnUnmount) useGLTF.clear(src);
    };
  }, [src, clearCacheOnUnmount]);

  useEffect(() => {
    setReadyPanes(new Set());
    setLoaded(!src);
    loadReported.current = false;
    setLocked(false);
  }, [mode, src]);

  useEffect(() => {
    if (readyPanes.size < expectedPanes) return;
    setLoaded(true);
    if (!loadReported.current) {
      loadReported.current = true;
      onLoad?.();
    }
  }, [expectedPanes, onLoad, readyPanes]);

  const effectiveAnimation = controlledAnimation === null ? null
    : animationNames.includes(animation ?? "") ? animation
    : controlledAnimation === undefined ? animationNames[0] ?? null : animation;
  useEffect(() => {
    if (controlledAnimation === undefined) setAnimation(defaultAnimation);
  }, [src, defaultAnimation, controlledAnimation, setAnimation]);

  useEffect(() => { setInspectorOpen(showInspector); }, [showInspector]);
  useEffect(() => { setSelectedMesh(null); setInspection(null); }, [src]);
  useEffect(() => {
    const rejectLock = () => { setPointerLockAvailable(false); setLocked(false); };
    document.addEventListener("pointerlockerror", rejectLock);
    return () => document.removeEventListener("pointerlockerror", rejectLock);
  }, []);
  const reportInspection = useCallback((value: ModelInspection) => {
    setInspection(value);
    onInspect?.(value);
  }, [onInspect]);

  useEffect(() => {
    const update = () => {
      const active = document.fullscreenElement === viewerRef.current;
      setIsFullscreen(active);
      if (active) setIsExpanded(false);
    };
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  useEffect(() => {
    if (!isExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setIsExpanded(false); };
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", close);
    };
  }, [isExpanded]);

  useEffect(() => {
    setPointerLockAvailable("requestPointerLock" in HTMLElement.prototype);
    return () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); };
  }, []);

  const markReady = useCallback((index: number) => {
    setReadyPanes((current) => current.has(index) ? current : new Set(current).add(index));
  }, []);

  const reportAnimations = useCallback((names: string[]) => {
    setAnimationNames((current) => current.length === names.length && current.every((name, index) => name === names[index]) ? current : names);
  }, []);

  const fail = useCallback((error: Error) => {
    setLoaded(true);
    setViewerError(true);
    onError?.(error);
  }, [onError]);

  function report(message: string, error = false) {
    setFeedback({ message, error });
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4500);
  }

  function changeMode(next: ViewerMode) {
    if (next === mode) return;
    if (document.pointerLockElement) document.exitPointerLock();
    setMode(next);
  }

  async function capture(action: "copy" | "download") {
    const canvas = canvasRef.current;
    if (!canvas || !loaded || viewerError) return;
    try {
      const source = document.createElement("canvas");
      source.width = canvas.width;
      source.height = canvas.height;
      const context = source.getContext("2d");
      if (!context) throw new Error("The viewer could not create a PNG.");
      context.fillStyle = lighting === "day" ? "#e7e9e4" : "#111a22";
      context.fillRect(0, 0, source.width, source.height);
      context.drawImage(canvas, 0, 0);
      const image = new Promise<Blob>((resolve, reject) => {
        source.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The viewer could not create a PNG.")), "image/png");
      });
      if (action === "copy") {
        if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("Image clipboard access is unavailable. Download the PNG instead.");
        await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
        report("Screenshot copied to clipboard.");
      } else {
        const blob = await image;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${alt.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "model-view"}.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        report("Screenshot downloaded as PNG.");
      }
    } catch (error) {
      report(error instanceof Error ? error.message : "Could not capture the view.", true);
    }
  }

  async function toggleFullscreen() {
    if (isExpanded) { setIsExpanded(false); return; }
    try {
      if (document.fullscreenElement === viewerRef.current) { await document.exitFullscreen(); return; }
      if (!document.fullscreenEnabled || !viewerRef.current) throw new Error("Fullscreen unavailable");
      await viewerRef.current.requestFullscreen();
    } catch {
      setIsExpanded(true);
    }
  }

  return (
    <ViewerUiProvider components={components}><div
      ref={viewerRef}
      className={cn("model-viewer", showUi && "has-ui", lighting === "night" && "is-night", isExpanded && "is-expanded", className)}
      style={{ height }}
      data-viewer-mode={mode}
      data-viewer-key={viewerKey}
      aria-label={alt}
      role="group"
    >
      {poster && !loaded && <img className="viewer-poster" src={poster} alt="" aria-hidden="true" />}
      <ViewerErrorBoundary key={src ?? "demo"} fallback={errorFallback} onError={fail}>
        <div className="viewer-scenes">
          {panes.map((pane, index) => {
            const paneKey = `${viewerKey}-pane-${index}`;
            return (
              <div className={cn("viewer-scene", index === 0 ? "viewer-scene-primary" : "viewer-scene-secondary")} key={`${mode}-${pane.face ?? "primary"}`}>
                <div ref={paneTracks[index]} className="viewer-view" data-viewer-pane={paneKey} />
                {showUi && mode === "split" && <span className="viewer-pane-label">{pane.label}</span>}
              </div>
            );
          })}
        </div>
        <Canvas
          className="viewer-canvas"
          dpr={quality}
          frameloop={effectiveAutoRotate || (effectiveAnimationPlaying && Boolean(effectiveAnimation)) ? "always" : "demand"}
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: showUi, powerPreference: "high-performance" }}
          eventSource={viewerRef}
          onCreated={({ gl }) => { canvasRef.current = gl.domElement; gl.setClearAlpha(0); }}
        >
          <AdaptiveDpr pixelated />
          <RedrawAfterResize />
          <PerformanceMonitor onChange={({ factor }) => { setQuality(0.75 + factor * 1.25); onPerformanceChange?.(factor); }} />
          {panes.map((pane, index) => {
            const paneKey = `${viewerKey}-pane-${index}`;
            return (
              <ScissorView
                key={`${mode}-${pane.face ?? "primary"}`}
                track={paneTracks[index]}
                index={index + 1}
                clearColor={lighting === "day" ? "#e7e9e4" : "#111a22"}
              >
                  <ViewerScene
                    lighting={lighting}
                    shading={shading}
                    grid={grid}
                    src={src}
                    cubes={cubes}
                    mode={mode}
                    face={pane.face}
                    cameraPreset={pane.face ?? cameraPreset}
                    resetToken={resetToken}
                    autoRotate={index === 0 && effectiveAutoRotate}
                    autoRotateSpeed={autoRotateSpeed}
                    showOrientation={index === 0 && showOrientation && mode !== "split"}
                    viewCube={viewCube}
                    viewCubePosition={viewCubePosition}
                    viewCubeMargin={viewCubeMargin}
                    toolbarVisible={showUi}
                    projection={projection}
                    onInspect={index === 0 ? reportInspection : undefined}
                    selectedMesh={selectedMesh}
                    onSelectMesh={setSelectedMesh}
                    pointerLockAvailable={pointerLockAvailable}
                    paneSelector={`[data-viewer-pane="${paneKey}"]`}
                    environment={environment}
                    animation={effectiveAnimation}
                    animationPlaying={effectiveAnimationPlaying}
                    animationSpeed={animationSpeed}
                    animationResetToken={animationResetToken}
                    loopAnimation={loopAnimation}
                    useDraco={useDraco}
                    useMeshopt={useMeshopt}
                    extendLoader={extendLoader}
                    onReady={() => markReady(index)}
                    onAnimations={reportAnimations}
                    onCameraChange={index === 0 ? onCameraChange : undefined}
                    onLockChange={index === 0 ? setLocked : undefined}
                  />
              </ScissorView>
            );
          })}
          <Preload all />
        </Canvas>
      </ViewerErrorBoundary>

      {!loaded && <ViewerLoader fallback={loadingFallback} poster={Boolean(poster)} />}
      {overlay && <div className="viewer-overlay-slot">{overlay}</div>}

      {showUi && (
        <>
          <div className="viewer-toolbar" role="toolbar" aria-label="3D viewer controls">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="viewer-shading-trigger" aria-label={`Shading: ${shading}`}>
                  {shading}<ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6} className="viewer-menu">
                {(["realistic", "solid", "normals", "wireframe"] as const).map((option) => (
                  <DropdownMenuItem key={option} onSelect={() => setShading(option)}>
                    <Check className={option === shading ? "is-visible" : "is-hidden"} /><span>{option}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="viewer-toolbar-group" aria-label="Interaction mode">
              <ViewerButton icon={<Rotate3D />} label="Orbit camera" active={mode === "orbit"} onClick={() => changeMode("orbit")} />
              <ViewerButton icon={<LayoutGrid />} label="Four-view split" active={mode === "split"} onClick={() => changeMode("split")} />
              <ViewerButton icon={<Footprints />} label="Fly camera" active={mode === "firstPerson"} onClick={() => changeMode("firstPerson")} />
            </div>
            <div className="viewer-toolbar-group" aria-label="Scene options">
              <ViewerButton icon={lighting === "day" ? <Sun /> : <Moon />} label={lighting === "day" ? "Switch to night" : "Switch to day"} active={lighting === "night"} onClick={() => setLighting(lighting === "day" ? "night" : "day")} />
              <ViewerButton icon={<Grid2X2 />} label="Show grid" active={grid} onClick={() => setGrid(!grid)} />
              <ViewerButton icon={<ScanSearch />} label="Orthographic view" active={projection === "orthographic"} onClick={() => setProjection(projection === "orthographic" ? "perspective" : "orthographic")} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button type="button" size="icon-sm" variant="ghost" aria-label="View cube options"><Box /></Button></DropdownMenuTrigger>
                <DropdownMenuContent className="viewer-menu">
                  {([false, "drei", "asset-studio"] as const).map((value) => <DropdownMenuItem key={String(value)} onSelect={() => setViewCube(value)}><Check className={viewCube === value ? "is-visible" : "is-hidden"} />{value === false ? "Off" : value === "drei" ? "Drei cube" : "Asset Studio"}</DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
              <ViewerButton icon={<ListTree />} label="Inspect model" active={inspectorOpen} onClick={() => setInspectorOpen(!inspectorOpen)} />
              <ViewerButton icon={<RotateCcw />} label="Reset view" onClick={() => setResetToken((value) => value + 1)} />
              <DropdownMenu open={captureMenuOpen} onOpenChange={setCaptureMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="icon-sm" variant={captureMenuOpen ? "secondary" : "ghost"} aria-label="Screenshot options" title="Screenshot options" disabled={!loaded || viewerError}><Camera /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="viewer-capture-menu">
                  <div className="viewer-capture-title">Capture view <span>PNG</span></div>
                  <DropdownMenuItem onSelect={() => void capture("copy")}><Copy /> Copy to clipboard</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void capture("download")}><Download /> Download image</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {showAnimationControls && animationNames.length > 0 && (
            <div className="viewer-animation-controls" role="toolbar" aria-label="Animation controls">
              <ViewerButton icon={animationPlaying ? <Pause /> : <Play />} label={animationPlaying ? "Pause animation" : "Play animation"} active={animationPlaying} onClick={() => setAnimationPlaying(!animationPlaying)} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="sm" variant="ghost" className="viewer-animation-name">{effectiveAnimation ?? "No animation"}<ChevronDown /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={6} className="viewer-animation-menu">
                  {animationNames.map((name) => <DropdownMenuItem key={name} onSelect={() => setAnimation(name)}><Check className={name === effectiveAnimation ? "is-visible" : "is-hidden"} />{name}</DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
              <ViewerButton icon={<RotateCcw />} label="Restart animation" onClick={() => setAnimationResetToken((value) => value + 1)} />
              <Button type="button" size="icon-sm" variant="ghost" aria-label={`Animation speed ${animationSpeed}×`} title={`Animation speed ${animationSpeed}×`} onClick={() => setAnimationSpeed(animationSpeeds[(animationSpeeds.indexOf(animationSpeed) + 1) % animationSpeeds.length] ?? 1)}><Gauge /><span className="viewer-speed-label">{animationSpeed}×</span></Button>
            </div>
          )}

          <div className={cn("viewer-help", feedback?.error && "is-error")} role={feedback?.error ? "alert" : "status"}>
            {feedback?.message ?? (mode === "firstPerson"
              ? pointerLockAvailable
                ? locked ? "WASD to fly · Space up · Shift down · Esc to release" : "Click the scene to look · WASD to fly"
                : "Drag to look · WASD to fly · Space / Shift vertically"
              : mode === "split" ? "Fixed views · Drag to pan · Scroll to zoom" : "Drag to orbit · Scroll to zoom")}
          </div>
          <Button type="button" size="icon-sm" variant="ghost" className="viewer-fullscreen" aria-label={isFullscreen || isExpanded ? "Exit fullscreen" : "Enter fullscreen"} title={isFullscreen || isExpanded ? "Exit fullscreen" : "Enter fullscreen"} onClick={() => void toggleFullscreen()}>
            {isFullscreen || isExpanded ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </>
      )}
      {inspectorOpen && inspection && <ModelInspector inspection={inspection} selectedMesh={selectedMesh} onSelectMesh={setSelectedMesh} onClose={() => setInspectorOpen(false)} />}
    </div></ViewerUiProvider>
  );
}

function ViewerButton({ icon, label, active, onClick }: { icon: ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return <Button type="button" size="icon-sm" variant={active ? "secondary" : "ghost"} aria-label={label} title={label} aria-pressed={active} onClick={onClick}>{icon}</Button>;
}

function ViewerLoader({ fallback, poster }: { fallback?: ModelViewerProps["loadingFallback"]; poster: boolean }) {
  const { active, progress, item, loaded, total } = useProgress();
  const data = { active, progress, item, loaded, total };
  const custom = typeof fallback === "function" ? fallback(data) : fallback;
  return (
    <div className={cn("viewer-loader", poster && "has-poster")} role="status" aria-live="polite">
      {custom ?? <><div className="viewer-loader-cube" /><span>{Math.round(progress)}%</span><small>{item ? fileName(item) : "Preparing model"}</small></>}
    </div>
  );
}

function ScissorView({ track, index, clearColor, children }: {
  track: RefObject<HTMLDivElement | null>;
  index: number;
  clearColor: string;
  children: ReactNode;
}) {
  const [scene] = useState(() => new Scene());
  const [size, setSize] = useState({ width: 1, height: 1, top: 0, left: 0 });

  useLayoutEffect(() => {
    const element = track.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      setSize((current) => current.width === rect.width && current.height === rect.height && current.top === rect.top && current.left === rect.left
        ? current
        : { width: rect.width, height: rect.height, top: rect.top, left: rect.left });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [track]);

  const compute = useCallback<ComputeFunction>((event, state) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    if (!(event.target instanceof Node) || !track.current?.contains(event.target)) {
      state.pointer.set(10000, 10000);
      state.raycaster.setFromCamera(state.pointer, state.camera);
      return;
    }
    state.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    state.raycaster.setFromCamera(state.pointer, state.camera);
  }, [track]);

  return createPortal(
    <ScissorRenderer track={track} index={index} clearColor={clearColor}>{children}</ScissorRenderer>,
    scene,
    { events: { compute, priority: index }, size },
  );
}

function RedrawAfterResize() {
  const dpr = useThree(state => state.viewport.dpr);
  const size = useThree(state => state.size);
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    // Changing pixel ratio clears WebGL's drawing buffer, even when the scene is idle.
    const frame = requestAnimationFrame(() => invalidate());
    return () => cancelAnimationFrame(frame);
  }, [dpr, size.width, size.height, invalidate]);
  return null;
}

function ScissorRenderer({ track, index, clearColor, children }: {
  track: RefObject<HTMLDivElement | null>;
  index: number;
  clearColor: string;
  children: ReactNode;
}) {
  useFrame((state) => {
    const element = track.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const canvasRect = state.gl.domElement.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0
      && rect.right > canvasRect.left && rect.left < canvasRect.right
      && rect.bottom > canvasRect.top && rect.top < canvasRect.bottom;
    if (!visible) return;

    if (index === 1) {
      state.gl.setScissorTest(false);
      state.gl.setClearColor(clearColor, 1);
      state.gl.clear(true, true, true);
    }

    const left = rect.left - canvasRect.left;
    const bottom = canvasRect.bottom - rect.bottom;
    const autoClear = state.gl.autoClear;
    state.gl.autoClear = false;
    state.gl.setViewport(left, bottom, rect.width, rect.height);
    state.gl.setScissor(left, bottom, rect.width, rect.height);
    state.gl.setScissorTest(true);
    state.gl.clear(false, true, true);
    state.gl.render(state.scene, state.camera);
    state.gl.setScissorTest(false);
    state.gl.autoClear = autoClear;
  }, index);
  return <>{children}<group onPointerOver={() => undefined} /></>;
}

function ViewerScene({
  lighting,
  shading,
  grid,
  src,
  cubes,
  mode,
  face,
  cameraPreset,
  resetToken,
  autoRotate,
  autoRotateSpeed,
  showOrientation,
  viewCube,
  viewCubePosition,
  viewCubeMargin,
  toolbarVisible,
  projection,
  onInspect,
  selectedMesh,
  onSelectMesh,
  pointerLockAvailable,
  paneSelector,
  environment,
  animation,
  animationPlaying,
  animationSpeed,
  animationResetToken,
  loopAnimation,
  useDraco,
  useMeshopt,
  extendLoader,
  onReady,
  onAnimations,
  onCameraChange,
  onLockChange,
}: {
  lighting: ViewerLighting;
  shading: ViewerShading;
  grid: boolean;
  src?: string;
  cubes: boolean;
  mode: ViewerMode;
  face?: ViewFace;
  cameraPreset: ViewerCameraPreset;
  resetToken: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  showOrientation: boolean;
  viewCube: ViewerViewCube | false;
  viewCubePosition: ViewCubePosition;
  viewCubeMargin?: [number, number];
  toolbarVisible: boolean;
  projection: "perspective" | "orthographic";
  onInspect?: (value: ModelInspection) => void;
  selectedMesh: string | null;
  onSelectMesh: (id: string | null) => void;
  pointerLockAvailable: boolean;
  paneSelector: string;
  environment: boolean;
  animation: string | null;
  animationPlaying: boolean;
  animationSpeed: number;
  animationResetToken: number;
  loopAnimation: boolean;
  useDraco: boolean | string;
  useMeshopt: boolean;
  extendLoader?: (loader: GLTFLoader) => void;
  onReady: () => void;
  onAnimations: (names: string[]) => void;
  onCameraChange?: (state: ViewerCameraState) => void;
  onLockChange?: (locked: boolean) => void;
}) {
  const contentRef = useRef<Group | null>(null);
  const paneWidth = useThree(state => state.size.width);
  const cubeMargin: [number, number] = viewCubeMargin ?? [64, toolbarVisible && paneWidth <= 680 && viewCubePosition.startsWith("top-") ? 148 : 64];
  const [fitVersion, setFitVersion] = useState(0);
  const [gridScale, setGridScale] = useState(1);
  const handleCentered = useCallback(({ container }: { container: Object3D }) => {
    // Include the animation envelope, and keep grid density relative to the asset.
    setGridScale(frameBounds(container, 1).radius / 2);
    setFitVersion((value) => value + 1);
  }, []);
  const background = lighting === "day" ? "#e7e9e4" : "#111a22";

  return (
    <>
      {projection === "orthographic" ? <OrthographicCamera makeDefault position={[3, 3, 3]} near={0.001} far={1000} /> : <PerspectiveCamera makeDefault position={[3, 3, 3]} fov={42} near={0.01} far={1000} />}
      <color attach="background" args={[background]} />
      <ambientLight intensity={lighting === "day" ? 0.48 : 0.3} />
      <directionalLight position={[5, 9, 6]} intensity={lighting === "day" ? 1.7 : 1.05} color={lighting === "day" ? "#fff7e6" : "#bdd5ff"} />
      <directionalLight position={[-4, 4, -6]} intensity={lighting === "day" ? 0.45 : 1.4} color={lighting === "day" ? "#dcebdc" : "#688db3"} />
      {environment && <StudioEnvironment lighting={lighting} />}
      {grid && <Grid infiniteGrid fadeFrom={0} fadeDistance={18 * gridScale} fadeStrength={1.6} cellSize={0.25 * gridScale} sectionSize={gridScale} cellThickness={0.45} sectionThickness={1.15} cellColor={lighting === "day" ? "#a8b5a6" : "#304651"} sectionColor={lighting === "day" ? "#708773" : "#55788b"} position={[0, 0.002 * gridScale, 0]} />}
      <Suspense fallback={null}>
        <Center ref={contentRef} top precise onCentered={handleCentered}>
          <SceneObject
            src={src}
            cubes={cubes}
            shading={shading}
            animation={animation}
            animationPlaying={animationPlaying}
            animationSpeed={animationSpeed}
            animationResetToken={animationResetToken}
            loopAnimation={loopAnimation}
            useDraco={useDraco}
            useMeshopt={useMeshopt}
            extendLoader={extendLoader}
            onReady={onReady}
            onAnimations={onAnimations}
            onInspect={onInspect}
            selectedMesh={selectedMesh}
            onSelectMesh={onSelectMesh}
          />
        </Center>
      </Suspense>
      {mode === "firstPerson" && !face ? (
        <>
          <FitStaticCamera objectRef={contentRef} fitVersion={fitVersion} preset={cameraPreset} resetToken={resetToken} />
          {pointerLockAvailable ? <PointerLockControls makeDefault selector={paneSelector} onLock={() => onLockChange?.(true)} onUnlock={() => onLockChange?.(false)} /> : <DragLook selector={paneSelector} />}
          <FirstPersonMovement requirePointerLock={pointerLockAvailable} selector={paneSelector} />
        </>
      ) : (
        <>
          <CameraRig fixed={Boolean(face)} paneSelector={paneSelector} objectRef={contentRef} fitVersion={fitVersion} preset={cameraPreset} resetToken={resetToken} autoRotate={autoRotate} autoRotateSpeed={autoRotateSpeed} onCameraChange={onCameraChange} />
          {showOrientation && viewCube && <ViewCube variant={viewCube} position={viewCubePosition} margin={cubeMargin} renderPriority={2} />}
        </>
      )}
    </>
  );
}

function StudioEnvironment({ lighting }: { lighting: ViewerLighting }) {
  const night = lighting === "night";
  return (
    <Environment resolution={128} frames={1} background={false} environmentIntensity={night ? 0.7 : 0.9}>
      <Lightformer form="rect" intensity={night ? 2.4 : 3.2} color={night ? "#91b8ef" : "#fff4dc"} position={[0, 5, 5]} scale={[8, 3, 1]} />
      <Lightformer form="rect" intensity={night ? 1.8 : 2} color={night ? "#5f81a9" : "#dcebdc"} position={[-5, 2, -3]} rotation={[0, Math.PI / 2, 0]} scale={[5, 3, 1]} />
      <Lightformer form="ring" intensity={night ? 1.2 : 1.6} color={night ? "#d9e8ff" : "#ffffff"} position={[4, 1, -4]} scale={2.5} />
    </Environment>
  );
}

function SceneObject({ src, cubes, shading, animation, animationPlaying, animationSpeed, animationResetToken, loopAnimation, useDraco, useMeshopt, extendLoader, onReady, onAnimations, onInspect, selectedMesh, onSelectMesh }: {
  onInspect?: (value: ModelInspection) => void;
  selectedMesh: string | null;
  onSelectMesh: (id: string | null) => void;
  src?: string;
  cubes: boolean;
  shading: ViewerShading;
  animation: string | null;
  animationPlaying: boolean;
  animationSpeed: number;
  animationResetToken: number;
  loopAnimation: boolean;
  useDraco: boolean | string;
  useMeshopt: boolean;
  extendLoader?: (loader: GLTFLoader) => void;
  onReady: () => void;
  onAnimations: (names: string[]) => void;
}) {
  const group = useRef<Group>(null);
  useEffect(() => { if (group.current) onInspect?.(inspectModel(group.current)); }, [src, cubes, onInspect]);
  useEffect(() => {
    if (!src) {
      onAnimations([]);
      onReady();
    }
  }, [src, onAnimations, onReady]);
  return (
    <group ref={group} onClick={(event) => { event.stopPropagation(); onSelectMesh(event.object.userData.viewerNodeId ?? null); }}>
      {src && <LoadedModel src={src} shading={shading} animation={animation} animationPlaying={animationPlaying} animationSpeed={animationSpeed} animationResetToken={animationResetToken} loopAnimation={loopAnimation} useDraco={useDraco} useMeshopt={useMeshopt} extendLoader={extendLoader} onReady={onReady} onAnimations={onAnimations} selectedMesh={selectedMesh} onSelectMesh={onSelectMesh} />}
      {cubes && (
        <>
          <mesh name="Cube" position={[-1.25, 0.45, 0]} rotation={[0, 0.25, 0.08]}><boxGeometry args={[0.9, 0.9, 0.9]} /><ViewerMaterial shading={selectedMesh === "0/0" ? "solid" : shading} color={selectedMesh === "0/0" ? "#e9c56a" : "#b3c899"} /></mesh>
          <mesh name="Dodecahedron" position={[1.05, 0.55, -0.55]} rotation={[0, -0.35, 0]}><dodecahedronGeometry args={[0.55, 0]} /><ViewerMaterial shading={selectedMesh === "0/1" ? "solid" : shading} color={selectedMesh === "0/1" ? "#e9c56a" : "#d19a78"} /></mesh>
          <mesh name="Sphere" position={[0.15, 0.42, 1]}><sphereGeometry args={[0.42, 48, 48]} /><ViewerMaterial shading={selectedMesh === "0/2" ? "solid" : shading} color={selectedMesh === "0/2" ? "#e9c56a" : "#7fa7a7"} /></mesh>
        </>
      )}
    </group>
  );
}

function LoadedModel({ src, shading, animation, animationPlaying, animationSpeed, animationResetToken, loopAnimation, useDraco, useMeshopt, extendLoader, onReady, onAnimations, selectedMesh, onSelectMesh }: {
  selectedMesh: string | null;
  onSelectMesh: (id: string | null) => void;
  src: string;
  shading: ViewerShading;
  animation: string | null;
  animationPlaying: boolean;
  animationSpeed: number;
  animationResetToken: number;
  loopAnimation: boolean;
  useDraco: boolean | string;
  useMeshopt: boolean;
  extendLoader?: (loader: GLTFLoader) => void;
  onReady: () => void;
  onAnimations: (names: string[]) => void;
}) {
  const gltf = useGLTF(src, useDraco, useMeshopt, extendLoader);
  prepareAnimationBounds(gltf.scene, gltf.animations);
  const model = useMemo(() => {
    const result = clone(gltf.scene);
    result.updateMatrixWorld(true);
    return result;
  }, [gltf.scene]);
  const { actions, names } = useAnimations(gltf.animations, model);
  const activeAction = animation ? actions[animation] : undefined;
  const playback = useRef({ animationPlaying, animationSpeed });
  playback.current = { animationPlaying, animationSpeed };
  useEffect(() => {
    const restore: (() => void)[] = [];
    model.traverse(object => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const selected = object.userData.viewerNodeId === selectedMesh;
      if (!selected && shading === "realistic") return;
      const original = mesh.material;
      const material = selected ? new MeshStandardMaterial({ color: "#e9c56a", emissive: "#a36d15", emissiveIntensity: 0.35 })
        : shading === "normals" ? new MeshNormalMaterial()
        : shading === "wireframe" ? new MeshBasicMaterial({ color: "#34483f", wireframe: true })
        : new MeshStandardMaterial({ color: "#a7aaa5", roughness: 0.82 });
      mesh.material = material;
      restore.push(() => { mesh.material = original; material.dispose(); });
    });
    return () => restore.forEach(reset => reset());
  }, [model, selectedMesh, shading]);

  useEffect(() => {
    onAnimations(names);
    onReady();
  }, [gltf, names, onAnimations, onReady]);

  useEffect(() => {
    if (!activeAction) return;
    activeAction.reset();
    activeAction.clampWhenFinished = !loopAnimation;
    activeAction.setLoop(loopAnimation ? LoopRepeat : LoopOnce, loopAnimation ? Infinity : 1);
    activeAction.play();
    activeAction.paused = !playback.current.animationPlaying;
    activeAction.setEffectiveTimeScale(playback.current.animationSpeed);
    return () => { activeAction.stop(); };
  }, [activeAction, animation, loopAnimation]);

  useEffect(() => {
    if (!activeAction) return;
    activeAction.paused = !animationPlaying;
    activeAction.setEffectiveTimeScale(animationSpeed);
  }, [activeAction, animationPlaying, animationSpeed]);

  useEffect(() => {
    if (!activeAction || animationResetToken === 0) return;
    activeAction.reset().play();
    activeAction.paused = !playback.current.animationPlaying;
  }, [activeAction, animationResetToken]);

  return <primitive object={model} onClick={(event: import("@react-three/fiber").ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelectMesh(event.object.userData.viewerNodeId ?? null); }} />;
}

function ViewerMaterial({ shading, color = "#a7aaa5" }: { shading: ViewerShading; color?: string }) {
  if (shading === "normals") return <meshNormalMaterial />;
  if (shading === "wireframe") return <meshBasicMaterial color="#34483f" wireframe />;
  return <meshStandardMaterial color={color} roughness={shading === "solid" ? 0.82 : 0.68} metalness={0} />;
}

function CameraRig({ objectRef, fitVersion, preset, resetToken, autoRotate, autoRotateSpeed, onCameraChange, paneSelector, fixed }: {
  fixed: boolean;
  paneSelector: string;
  objectRef: RefObject<Group | null>;
  fitVersion: number;
  preset: ViewerCameraPreset;
  resetToken: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  onCameraChange?: (state: ViewerCameraState) => void;
}) {
  const controls = useRef<CameraControlsImpl | null>(null);
  const camera = useThree((state) => state.camera as ThreePerspectiveCamera | ThreeOrthographicCamera);
  const size = useThree((state) => state.size);

  const frameObject = useCallback((transition: boolean) => {
    const object = objectRef.current;
    if (!object || !controls.current) return;
    const { center, radius, distance, near, far } = frameBounds(object, size.width / size.height, "fov" in camera ? camera.fov : 42);
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
    if ("isOrthographicCamera" in camera) void controls.current.zoomTo(Math.min(size.width, size.height) / (radius * 2.3), false);
    const direction = new Vector3(...presetVectors[preset]).normalize();
    const position = center.clone().add(direction.multiplyScalar(distance));
    controls.current.minDistance = radius * 0.05;
    controls.current.maxDistance = distance * 10;
    void controls.current.setLookAt(position.x, position.y, position.z, center.x, center.y, center.z, transition);
    if (!transition) controls.current.saveState();
  }, [camera, objectRef, preset, size.width, size.height]);

  useEffect(() => { frameObject(false); }, [fitVersion, frameObject, size.width, size.height]);
  useEffect(() => { if (resetToken > 0) frameObject(true); }, [resetToken, frameObject]);

  useFrame((_, delta) => {
    if (autoRotate && controls.current) controls.current.rotate(autoRotateSpeed * delta, 0, false);
  });

  function reportCamera() {
    if (!controls.current || !onCameraChange) return;
    const position = controls.current.getPosition(new Vector3());
    const target = controls.current.getTarget(new Vector3());
    onCameraChange({ position: position.toArray(), target: target.toArray() });
  }

  const actions = CameraControlsImpl.ACTION;
  const orthographic = "isOrthographicCamera" in camera;
  return <CameraControls
    ref={controls}
    domElement={document.querySelector<HTMLElement>(paneSelector) ?? undefined}
    regress makeDefault smoothTime={0.25} dollyToCursor onRest={reportCamera}
    azimuthRotateSpeed={fixed ? 0 : 1}
    polarRotateSpeed={fixed ? 0 : 1}
    mouseButtons={{ left: fixed ? actions.TRUCK : actions.ROTATE, right: actions.TRUCK, middle: orthographic ? actions.ZOOM : actions.DOLLY, wheel: orthographic ? actions.ZOOM : actions.DOLLY }}
    touches={{ one: fixed ? actions.TOUCH_TRUCK : actions.TOUCH_ROTATE, two: orthographic ? actions.TOUCH_ZOOM_TRUCK : actions.TOUCH_DOLLY_TRUCK, three: actions.TOUCH_TRUCK }}
  />;
}

function FitStaticCamera({ objectRef, fitVersion, preset, resetToken }: { objectRef: RefObject<Group | null>; fitVersion: number; preset: ViewerCameraPreset; resetToken: number }) {
  const camera = useThree((state) => state.camera as ThreePerspectiveCamera | ThreeOrthographicCamera);
  const size = useThree((state) => state.size);
  useEffect(() => {
    const object = objectRef.current;
    if (!object) return;
    const { center, radius, distance, near, far } = frameBounds(object, size.width / size.height, "fov" in camera ? camera.fov : 42);
    const direction = new Vector3(...presetVectors[preset]).normalize();
    camera.position.copy(center).add(direction.multiplyScalar(distance));
    camera.near = near;
    camera.far = far;
    if ("isOrthographicCamera" in camera) camera.zoom = Math.min(size.width, size.height) / (radius * 2.3);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }, [camera, fitVersion, objectRef, preset, resetToken, size.width, size.height]);
  return null;
}

function DragLook({ selector }: { selector: string }) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;
    let dragging = false;
    camera.rotation.reorder("YXZ");
    target.tabIndex = 0;
    const down = (event: globalThis.PointerEvent) => { if (event.button === 0) { dragging = true; target.focus(); target.setPointerCapture(event.pointerId); } };
    const move = (event: globalThis.PointerEvent) => {
      if (!dragging) return;
      camera.rotation.y -= event.movementX * 0.002;
      camera.rotation.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, camera.rotation.x - event.movementY * 0.002));
      invalidate();
    };
    const up = (event: globalThis.PointerEvent) => { dragging = false; if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId); };
    target.addEventListener("pointerdown", down);
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
    return () => {
      target.removeEventListener("pointerdown", down);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
  }, [camera, invalidate, selector]);
  return null;
}

function FirstPersonMovement({ requirePointerLock, selector }: { requirePointerLock: boolean; selector: string }) {
  const { camera, gl, invalidate } = useThree();
  const pressed = useRef(new Set<string>());
  useEffect(() => {
    const target = document.querySelector<HTMLElement>(selector);
    const down = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest("input, textarea, select, [contenteditable]")) return;
      if (!requirePointerLock && event.target !== target) return;
      if (requirePointerLock && document.pointerLockElement !== gl.domElement) return;
      pressed.current.add(event.code);
      invalidate();
      if ((document.pointerLockElement || !requirePointerLock) && (event.code.startsWith("Arrow") || event.code === "Space")) event.preventDefault();
    };
    const up = (event: KeyboardEvent) => pressed.current.delete(event.code);
    const blur = () => pressed.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [requirePointerLock, selector, gl, invalidate]);
  useFrame((_, delta) => {
    const target = document.querySelector<HTMLElement>(selector);
    if (requirePointerLock ? document.pointerLockElement !== gl.domElement : document.activeElement !== target) return;
    const speed = Math.min(delta, 0.05) * 2.2;
    const keys = pressed.current;
    const forward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
    const sideways = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
    const vertical = Number(keys.has("Space") || keys.has("KeyE")) - Number(keys.has("ShiftLeft") || keys.has("ShiftRight") || keys.has("KeyQ"));
    if (!forward && !sideways && !vertical) return;
    const scale = 1 / Math.hypot(forward, sideways, vertical);
    camera.translateZ(-forward * speed * scale);
    camera.translateX(sideways * speed * scale);
    camera.position.y += vertical * speed * scale;
    invalidate();
  });
  return null;
}

function useControlledState<T>(controlled: T | undefined, defaultValue: T, onChange?: (value: T) => void): [T, (value: T) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled === undefined ? internal : controlled;
  const setValue = useCallback((next: T) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  }, [controlled, onChange]);
  return [value, setValue];
}

function useReducedMotion(enabled: boolean) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (!enabled) { setReduced(false); return; }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [enabled]);
  return reduced;
}

function fileName(path: string) {
  return path.split(/[\\/]/).pop()?.split("?")[0] || path;
}
