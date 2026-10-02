"use client";
import { useGLTF } from "@react-three/drei";
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ModelInspection } from "./model-inspection";
import { createViewerCameraStore } from "./model-viewer-camera";
import { initialViewerLifecycle, viewerLifecycleReducer } from "./model-viewer-lifecycle";
import {
  splitPanes,
  type ModelViewerRootProps,
  type ModelViewerState,
  type ViewerMode,
} from "./model-viewer-types";
import { useControlledState } from "./use-controlled-state";
import { useViewerCapture } from "./use-viewer-capture";
import { useViewerFeedback } from "./use-viewer-feedback";
import { useViewerFullscreen } from "./use-viewer-fullscreen";
import { useReducedMotion, useViewerHidden } from "./use-viewer-visibility";

export function useModelViewerRuntime({
  components,
  src,
  alt = "3D model",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
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
  showFloor: controlledFloor,
  defaultShowFloor = false,
  onFloorChange,
  floorColor,
  showCubes: requestedCubes,
  showUi = true,
  enableCapture = showUi,
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
  autoRotate: controlledAutoRotate,
  defaultAutoRotate = false,
  onAutoRotateChange,
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
  showRetry = false,
  pauseWhenHidden = true,
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
  const [floor, setFloor] = useControlledState(
    controlledFloor,
    defaultShowFloor,
    onFloorChange,
  );
  const [autoRotate, setAutoRotate] = useControlledState(
    controlledAutoRotate,
    defaultAutoRotate,
    onAutoRotateChange,
  );
  const [cameraPreset, setCameraPreset] = useControlledState(
    controlledCameraPreset,
    defaultCameraPreset,
    onCameraPresetChange,
  );
  const [animation, setAnimation, resetAnimation] = useControlledState<string | null>(
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
  const [cameraStore] = useState(createViewerCameraStore);
  const [lifecycle, dispatchLifecycle] = useReducer(viewerLifecycleReducer, initialViewerLifecycle);
  const loaded = lifecycle.status === "ready" || lifecycle.status === "error";
  const viewerError = lifecycle.status === "error";
  const [retryToken, setRetryToken] = useState(0);
  const { feedback, report, clearFeedback } = useViewerFeedback();
  const [locked, setLocked] = useState(false);
  const [pointerLockAvailable, setPointerLockAvailable] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const [animationResetToken, setAnimationResetToken] = useState(0);
  const reducedMotion = useReducedMotion(respectReducedMotion);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const viewerHidden = useViewerHidden(viewerRef);
  const renderingPaused = pauseWhenHidden && viewerHidden;
  useImperativeHandle(ref, () => viewerRef.current!, []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [captureReady, setCaptureReady] = useState(false);
  const loadReportedGeneration = useRef<number | null>(null);
  const viewerKey = useId();
  const cubes = requestedCubes ?? !src;
  const expectedPanes = mode === "split" ? splitPanes.length : 1;
  const [sceneMounted, setSceneMountedState] = useState(false);
  /** Clear everything derived from the current scene/load generation. */
  const resetModelSession = useCallback(() => {
    setAnimationNames([]);
    setInspection(null);
    setSelectedMesh(null);
    setLocked(false);
  }, []);
  const setSceneMounted = useCallback((mounted: boolean) => {
    setSceneMountedState(mounted);
    dispatchLifecycle({ type: mounted ? "mount" : "unmount" });
    if (!mounted) {
      // The canvas goes away with the scene, so capture must wait for the next one.
      setCaptureReady(false);
      resetModelSession();
    }
  }, [resetModelSession]);
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
  const effectiveAutoRotate =
    autoRotate && !reducedMotion && !renderingPaused && mode === "orbit";
  const effectiveAnimationPlaying =
    animationPlaying && !reducedMotion && !renderingPaused;
  const paneTracks = useRef(
    Array.from({ length: splitPanes.length }, () => ({
      current: null as HTMLDivElement | null,
    })),
  ).current;

  useEffect(() => {
    dispatchLifecycle({ type: "reset" });
    clearFeedback();
    resetModelSession();
  }, [src, mode, enableCapture, clearFeedback, resetModelSession]);

  useEffect(() => () => {
    if (src && clearCacheOnUnmount) useGLTF.clear(src);
  }, [src, clearCacheOnUnmount]);

  useEffect(() => {
    if (lifecycle.status === "ready" && loadReportedGeneration.current !== lifecycle.generation) {
      loadReportedGeneration.current = lifecycle.generation;
      onLoad?.();
    }
  }, [lifecycle.status, lifecycle.generation, onLoad]);

  const effectiveAnimation =
    controlledAnimation === null
      ? null
      : animationNames.includes(animation ?? "")
        ? animation
        : controlledAnimation === undefined
          ? (animationNames[0] ?? null)
          : animation;
  const previousAnimationSrc = useRef(src);
  useEffect(() => {
    if (previousAnimationSrc.current === src) return;
    previousAnimationSrc.current = src;
    if (controlledAnimation === undefined) resetAnimation(defaultAnimation);
  }, [src, defaultAnimation, controlledAnimation, resetAnimation]);

  useEffect(() => {
    if (showInspector !== undefined && controlledInspectorOpen === undefined)
      setInspectorOpen(showInspector);
  }, [showInspector, controlledInspectorOpen, setInspectorOpen]);
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

  const { fullscreen, isExpanded, toggleFullscreen } = useViewerFullscreen(viewerRef, report);

  useEffect(() => {
    setPointerLockAvailable("requestPointerLock" in HTMLElement.prototype);
  }, []);

  const markReady = useCallback((index: number) => {
    dispatchLifecycle({ type: "ready", pane: index, expectedPanes });
  }, [expectedPanes]);

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
      dispatchLifecycle({ type: "error" });
      onError?.(error);
    },
    [onError],
  );

  const retry = useCallback(() => {
    if (!viewerError || !src) return;
    useGLTF.clear(src);
    dispatchLifecycle({ type: "reset" });
    clearFeedback();
    resetModelSession();
    setRetryToken((value) => value + 1);
  }, [src, viewerError, clearFeedback, resetModelSession]);

  function changeMode(next: ViewerMode) {
    if (next === mode) return;
    if (document.pointerLockElement) document.exitPointerLock();
    setMode(next);
  }

  const canCapture = enableCapture && captureReady && sceneMounted && loaded && !viewerError;
  const capture = useViewerCapture({
    canvasRef,
    canCapture,
    lighting,
    fileName: ariaLabel ?? alt,
    report,
  });

  const status = lifecycle.status;
  const state: ModelViewerState = {
    mode,
    setMode: changeMode,
    lighting,
    setLighting,
    shading,
    setShading,
    showGrid: grid,
    setShowGrid: setGrid,
    showFloor: floor,
    setShowFloor: setFloor,
    autoRotate,
    setAutoRotate,
    projection,
    setProjection,
    viewCube,
    setViewCube,
    cameraPreset,
    setCameraPreset,
    resetView: () => setResetToken((value) => value + 1),
    getCameraView: cameraStore.getSnapshot,
    setCameraView: cameraStore.setView,
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
    renderingPaused,
    retry,
    status,
    canCapture,
    capture,
    fullscreen,
    toggleFullscreen,
    feedback,
  };
  return {
    state,
    root: { components, className, style, children, height, props, isExpanded },
    viewerRef,
    canvasRef,
    enableCapture,
    setCaptureReady,
    viewerKey,
    cameraStore,
    toolbarOffset,
    reportToolbar,
    setSceneMounted,
    // Renderer configuration stays private; useModelViewer exposes only state/actions.
    src,
    accessibleLabel: ariaLabelledBy ? undefined : (ariaLabel ?? alt),
    ariaLabelledBy,
    mode,
    lighting,
    shading,
    grid,
    floor,
    floorColor,
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
    showRetry,
    retryToken,
    retry,
    renderingPaused,
    useDraco,
    useMeshopt,
    extendLoader,
    loaded,
    status,
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
