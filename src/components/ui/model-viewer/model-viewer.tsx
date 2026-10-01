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
  ViewerMode,
  ViewerLighting,
  ViewerShading,
  ViewerViewCube,
  ViewerCameraPreset,
  ViewerCameraState,
  ViewerProgress,
} from "./model-viewer-types";

/** Drop-in preset built entirely from the exported compound parts. */
export function ModelViewer({
  toolbar,
  overlay,
  children,
  showUi = true,
  showAnimationControls = true,
  ...props
}: ModelViewerProps) {
  return (
    <ModelViewerRoot showUi={showUi} {...props}>
      <ModelViewerScene />
      {overlay && <ModelViewerOverlay>{overlay}</ModelViewerOverlay>}
      {showUi && (
        <>
          {toolbar === undefined ? <ModelViewerDefaultToolbar /> : toolbar}
          {showAnimationControls && <ModelViewerAnimationBar />}
          <ModelViewerStatus />
          <ModelViewerFullscreen />
        </>
      )}
      <ModelViewerInspector />
      {children}
    </ModelViewerRoot>
  );
}
