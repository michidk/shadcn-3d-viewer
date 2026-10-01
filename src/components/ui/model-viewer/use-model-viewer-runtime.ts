"use client";
import { useGLTF } from "@react-three/drei";
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { ModelInspection } from "./model-inspection";
import {
  splitPanes,
  type ModelViewerRootProps,
  type ModelViewerState,
  type ViewerMode,
} from "./model-viewer-types";

export function useModelViewerRuntime({
  components,
  src,
  alt = "3D model",
  className,
  style,
  ref,
  children,
  height,
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
  showInspector,
  inspectorOpen: controlledInspectorOpen,
  defaultInspectorOpen = false,
  onInspectorOpenChange,
  onInspect,
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
  showFileName = false,
  loadingFallback,
  errorFallback,
  useDraco = true,
  useMeshopt = true,
  extendLoader,
  clearCacheOnUnmount = src?.startsWith("blob:") ?? false,
  respectReducedMotion = true,
  onPerformanceChange,
  onLoad,
  onError,
  ...props
}: ModelViewerRootProps) {
  const [mode, setMode] = useControlledState(
    controlledMode,
    defaultMode,
    onModeChange,
  );
  const [viewCube, setViewCube] = useControlledState(
    controlledViewCube,
    defaultViewCube,
    onViewCubeChange,
  );
  const [projection, setProjection] = useControlledState(
    controlledProjection,
    defaultProjection,
    onProjectionChange,
  );
  const [inspectorOpen, setInspectorOpen] = useControlledState(
    controlledInspectorOpen,
    showInspector ?? defaultInspectorOpen,
    onInspectorOpenChange,
  );
  const [inspection, setInspection] = useState<ModelInspection | null>(null);
  const [selectedMesh, setSelectedMesh] = useState<string | null>(null);
  const [quality, setQuality] = useState(1.5);
  const [lighting, setLighting] = useControlledState(
    controlledLighting,
    defaultLighting,
    onLightingChange,
  );
  const [shading, setShading] = useControlledState(
    controlledShading,
    defaultShading,
    onShadingChange,
  );
  const [grid, setGrid] = useControlledState(
    controlledGrid,
    defaultShowGrid,
    onGridChange,
  );
  const [cameraPreset, setCameraPreset] = useControlledState(
    controlledCameraPreset,
    defaultCameraPreset,
    onCameraPresetChange,
  );
  const [animation, setAnimation] = useControlledState<string | null>(
    controlledAnimation,
    defaultAnimation,
    onAnimationChange,
  );
  const [animationPlaying, setAnimationPlaying] = useControlledState(
    controlledAnimationPlaying,
    defaultAnimationPlaying,
    onAnimationPlayingChange,
  );
  const [animationSpeed, setAnimationSpeed] = useControlledState(
    controlledAnimationSpeed,
    defaultAnimationSpeed,
    onAnimationSpeedChange,
  );
  const [animationNames, setAnimationNames] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(!src);
  const [viewerError, setViewerError] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pointerLockAvailable, setPointerLockAvailable] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const [animationResetToken, setAnimationResetToken] = useState(0);
  const [readyPanes, setReadyPanes] = useState<Set<number>>(() => new Set());
  const reducedMotion = useReducedMotion(respectReducedMotion);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  useImperativeHandle(ref, () => viewerRef.current!, []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadReported = useRef(false);
  const viewerKey = useId();
  const cubes = requestedCubes ?? !src;
  const expectedPanes = mode === "split" ? splitPanes.length : 1;
  const [sceneMounted, setSceneMounted] = useState(false);
  const [toolbarOffset, setToolbarOffset] = useState(0);
  const toolbarMeasurements = useRef(new Map<HTMLElement, number>());
  const reportToolbar = useCallback(
    (element: HTMLElement, offset: number | null) => {
      if (offset === null) toolbarMeasurements.current.delete(element);
      else toolbarMeasurements.current.set(element, offset);
      setToolbarOffset(Math.max(0, ...toolbarMeasurements.current.values()));
    },
    [],
  );
  const effectiveAutoRotate = autoRotate && !reducedMotion && mode === "orbit";
  const effectiveAnimationPlaying = animationPlaying && !reducedMotion;
  const paneTracks = useRef(
    Array.from({ length: splitPanes.length }, () => ({
      current: null as HTMLDivElement | null,
    })),
  ).current;

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
    if (sceneMounted) return;
    setViewerError(false);
    setLocked(false);
    setReadyPanes(new Set());
    setInspection(null);
    setSelectedMesh(null);
    setAnimationNames([]);
    setLoaded(!src);
    loadReported.current = false;
  }, [sceneMounted, src]);

  useEffect(() => {
    if (readyPanes.size < expectedPanes) return;
    setLoaded(true);
    if (!loadReported.current) {
      loadReported.current = true;
      onLoad?.();
    }
  }, [expectedPanes, onLoad, readyPanes]);

  const effectiveAnimation =
    controlledAnimation === null
      ? null
      : animationNames.includes(animation ?? "")
        ? animation
        : controlledAnimation === undefined
          ? (animationNames[0] ?? null)
          : animation;
  useEffect(() => {
    if (controlledAnimation === undefined) setAnimation(defaultAnimation);
  }, [src, defaultAnimation, controlledAnimation, setAnimation]);

  useEffect(() => {
    if (showInspector !== undefined && controlledInspectorOpen === undefined)
      setInspectorOpen(showInspector);
  }, [showInspector, controlledInspectorOpen, setInspectorOpen]);
  useEffect(() => {
    setSelectedMesh(null);
    setInspection(null);
  }, [src]);
  useEffect(() => {
    const rejectLock = () => {
      setPointerLockAvailable(false);
      setLocked(false);
    };
    document.addEventListener("pointerlockerror", rejectLock);
    return () => document.removeEventListener("pointerlockerror", rejectLock);
  }, []);
  const reportInspection = useCallback(
    (value: ModelInspection) => {
      setInspection(value);
      onInspect?.(value);
    },
    [onInspect],
  );

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
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsExpanded(false);
    };
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", close);
    };
  }, [isExpanded]);

  useEffect(() => {
    setPointerLockAvailable("requestPointerLock" in HTMLElement.prototype);
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const markReady = useCallback((index: number) => {
    setReadyPanes((current) =>
      current.has(index) ? current : new Set(current).add(index),
    );
  }, []);

  const reportAnimations = useCallback((names: string[]) => {
    setAnimationNames((current) =>
      current.length === names.length &&
      current.every((name, index) => name === names[index])
        ? current
        : names,
    );
  }, []);

  const fail = useCallback(
    (error: Error) => {
      setLoaded(true);
      setViewerError(true);
      onError?.(error);
    },
    [onError],
  );

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
    if (!canvas || !sceneMounted || !loaded || viewerError) return;
    try {
      const source = document.createElement("canvas");
      source.width = canvas.width;
      source.height = canvas.height;
      const context = source.getContext("2d");
      if (!context) throw new Error("The viewer could not create a PNG.");
      context.fillStyle = lighting === "day" ? "#f5f5f5" : "#171717";
      context.fillRect(0, 0, source.width, source.height);
      context.drawImage(canvas, 0, 0);
      const image = new Promise<Blob>((resolve, reject) => {
        source.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(new Error("The viewer could not create a PNG.")),
          "image/png",
        );
      });
      if (action === "copy") {
        if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined")
          throw new Error(
            "Image clipboard access is unavailable. Download the PNG instead.",
          );
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": image }),
        ]);
        report("Screenshot copied to clipboard.");
      } else {
        const blob = await image;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${
          alt
            .replace(/[^a-z0-9-_]+/gi, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 80) || "model-view"
        }.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        report("Screenshot downloaded as PNG.");
      }
    } catch (error) {
      report(
        error instanceof Error ? error.message : "Could not capture the view.",
        true,
      );
    }
  }

  async function toggleFullscreen() {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }
    try {
      if (document.fullscreenElement === viewerRef.current) {
        await document.exitFullscreen();
        return;
      }
      if (!document.fullscreenEnabled || !viewerRef.current)
        throw new Error("Fullscreen unavailable");
      await viewerRef.current.requestFullscreen();
    } catch {
      setIsExpanded(true);
    }
  }

  const status = !sceneMounted
    ? "idle"
    : viewerError
      ? "error"
      : loaded
        ? "ready"
        : "loading";
  const state: ModelViewerState = {
    mode,
    setMode: changeMode,
    lighting,
    setLighting,
    shading,
    setShading,
    showGrid: grid,
    setShowGrid: setGrid,
    projection,
    setProjection,
    viewCube,
    setViewCube,
    cameraPreset,
    setCameraPreset,
    resetView: () => setResetToken((value) => value + 1),
    inspectorOpen,
    setInspectorOpen,
    inspection,
    selectedMesh,
    setSelectedMesh,
    animation: effectiveAnimation,
    animationNames,
    setAnimation,
    animationPlaying,
    setAnimationPlaying,
    animationSpeed,
    setAnimationSpeed,
    restartAnimation: () => setAnimationResetToken((value) => value + 1),
    reducedMotion,
    status,
    canCapture: sceneMounted && loaded && !viewerError,
    capture,
    fullscreen: isFullscreen || isExpanded,
    toggleFullscreen,
    feedback,
  };
  return {
    state,
    root: { components, className, style, children, height, props, isExpanded },
    viewerRef,
    canvasRef,
    viewerKey,
    toolbarOffset,
    reportToolbar,
    setSceneMounted,
    // Renderer configuration stays private; useModelViewer exposes only state/actions.
    src,
    alt,
    mode,
    lighting,
    shading,
    grid,
    cubes,
    cameraPreset,
    resetToken,
    showUi,
    showOrientation,
    viewCube,
    viewCubePosition,
    viewCubeMargin,
    projection,
    effectiveAutoRotate,
    autoRotateSpeed,
    effectiveAnimation,
    effectiveAnimationPlaying,
    animationSpeed,
    animationResetToken,
    loopAnimation,
    environment,
    poster,
    showFileName,
    loadingFallback,
    errorFallback,
    useDraco,
    useMeshopt,
    extendLoader,
    loaded,
    quality,
    setQuality,
    onPerformanceChange,
    onCameraChange,
    selectedMesh,
    setSelectedMesh,
    reportInspection,
    pointerLockAvailable,
    locked,
    setLocked,
    paneTracks,
    markReady,
    reportAnimations,
    fail,
  };
}

function useControlledState<T>(
  controlled: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void,
): [T, (value: T) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled === undefined ? internal : controlled;
  const setValue = useCallback(
    (next: T) => {
      if (controlled === undefined) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [value, setValue];
}

function useReducedMotion(enabled: boolean) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setReduced(false);
      return;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [enabled]);
  return reduced;
}
