"use client";
import type { ModelViewerProps } from "./model-viewer-types";
import { ModelViewerRoot } from "./model-viewer-root";
import { ModelViewerScene } from "./model-viewer-scene";
import {
  ModelViewerDefaultToolbar,
  ModelViewerAnimationBar,
  ModelViewerInspector,
  ModelViewerStatus,
  ModelViewerFullscreen,
  ModelViewerOverlay,
} from "./model-viewer-parts";

// Keep existing direct type imports working.
export type {
  ModelViewerProps,
  ModelInspectorPosition,
  ViewerMode,
  ViewerLighting,
  ViewerShading,
  ViewerViewCube,
  ViewerCameraPreset,
  ViewerCameraState,
  ViewerCameraOptions,
  ViewerProgress,
} from "./model-viewer-types";

/** Drop-in preset built entirely from the exported compound parts. */
export function ModelViewer({
  toolbar,
  overlay,
  sceneContent,
  children,
  showUi = true,
  showAnimationControls = true,
  inspectorPosition = "right",
  ...props
}: ModelViewerProps) {
  return (
    <ModelViewerRoot showUi={showUi} {...props}>
      <ModelViewerScene sceneContent={sceneContent} />
      {overlay && <ModelViewerOverlay>{overlay}</ModelViewerOverlay>}
      {showUi && (
        <>
          {toolbar === undefined ? <ModelViewerDefaultToolbar /> : toolbar}
          {showAnimationControls && <ModelViewerAnimationBar />}
          <ModelViewerStatus />
          <ModelViewerFullscreen />
        </>
      )}
      <ModelViewerInspector position={inspectorPosition} />
      {children}
    </ModelViewerRoot>
  );
}
