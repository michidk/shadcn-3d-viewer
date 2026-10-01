import type { ComponentProps, CSSProperties, ReactNode } from "react";
import type { GLTFLoader } from "three-stdlib";
import type { ModelInspection } from "./model-inspection";
import type { ViewerUiComponents } from "./viewer-ui";
import type { ViewCubePosition } from "./view-cube";

export type ViewerMode = "orbit" | "split" | "firstPerson";
export type ViewerLighting = "day" | "night";
export type ViewerShading = "realistic" | "solid" | "normals" | "wireframe";
export type ViewerViewCube = "drei" | "asset-studio";
export type ViewerCameraPreset =
  "isometric" | "front" | "right" | "back" | "left" | "top" | "bottom";

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

export interface ModelViewerProps extends Omit<
  ComponentProps<"div">,
  "onLoad" | "onError"
> {
  /** Compatibility escape hatch. Prefer local primitives, composition, and render. */
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
  /** Legacy initial/synchronized visibility. Prefer inspectorOpen/defaultInspectorOpen. */
  showInspector?: boolean;
  inspectorOpen?: boolean;
  defaultInspectorOpen?: boolean;
  onInspectorOpenChange?: (open: boolean) => void;
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
  /** Replace the default toolbar; null hides it. Custom controls can use useModelViewer(). */
  toolbar?: ReactNode;
  useDraco?: boolean | string;
  useMeshopt?: boolean;
  extendLoader?: (loader: GLTFLoader) => void;
  clearCacheOnUnmount?: boolean;
  respectReducedMotion?: boolean;
  onPerformanceChange?: (factor: number) => void;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export type ModelViewerRootProps = Omit<
  ModelViewerProps,
  "toolbar" | "overlay" | "showAnimationControls"
>;

export interface ModelViewerState {
  mode: ViewerMode;
  setMode: (mode: ViewerMode) => void;
  lighting: ViewerLighting;
  setLighting: (lighting: ViewerLighting) => void;
  shading: ViewerShading;
  setShading: (shading: ViewerShading) => void;
  showGrid: boolean;
  setShowGrid: (visible: boolean) => void;
  projection: "perspective" | "orthographic";
  setProjection: (projection: "perspective" | "orthographic") => void;
  viewCube: ViewerViewCube | false;
  setViewCube: (cube: ViewerViewCube | false) => void;
  cameraPreset: ViewerCameraPreset;
  setCameraPreset: (preset: ViewerCameraPreset) => void;
  resetView: () => void;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
  inspection: ModelInspection | null;
  selectedMesh: string | null;
  setSelectedMesh: (id: string | null) => void;
  animation: string | null;
  animationNames: string[];
  setAnimation: (clip: string | null) => void;
  animationPlaying: boolean;
  setAnimationPlaying: (playing: boolean) => void;
  animationSpeed: number;
  setAnimationSpeed: (speed: number) => void;
  restartAnimation: () => void;
  reducedMotion: boolean;
  status: "idle" | "loading" | "ready" | "error";
  canCapture: boolean;
  capture: (action: "copy" | "download") => Promise<void>;
  fullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
  feedback: { message: string; error: boolean } | null;
}
export type ViewFace = "front" | "right" | "back" | "left";

type Pane = {
  face?: ViewFace;
  label?: string;
};

export const splitPanes: Pane[] = [
  { face: "front", label: "Front" },
  { face: "right", label: "Right" },
  { face: "back", label: "Back" },
  { face: "left", label: "Left" },
];
