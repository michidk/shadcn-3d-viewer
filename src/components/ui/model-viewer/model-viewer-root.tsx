"use client";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { ViewerUiProvider } from "./viewer-ui";
import { ModelViewerContext } from "./model-viewer-context";
import { useModelViewerRuntime } from "./use-model-viewer-runtime";
import type { ModelViewerRootProps } from "./model-viewer-types";
import "./model-viewer.css";

/** Owns state and layout only. Mount exactly one ModelViewerScene inside it. */
export function ModelViewerRoot(props: ModelViewerRootProps) {
  const runtime = useModelViewerRuntime(props);
  const { state, root, viewerRef, viewerKey, toolbarOffset } = runtime;
  return (
    <ModelViewerContext.Provider value={runtime}>
      <ViewerUiProvider components={root.components}>
        <div
          ref={viewerRef}
          data-slot="model-viewer"
          data-state={state.status}
          data-viewer-mode={state.mode}
          data-viewer-key={viewerKey}
          aria-label={runtime.alt}
          role="group"
          className={cn(
            "model-viewer",
            toolbarOffset > 0 && "has-toolbar",
            state.lighting === "night" && "is-night",
            root.isExpanded && "is-expanded",
            root.className,
          )}
          style={
            {
              "--viewer-toolbar-offset": `${toolbarOffset}px`,
              height: root.height,
              ...root.style,
            } as CSSProperties
          }
          {...root.props}
        >
          {root.children}
        </div>
      </ViewerUiProvider>
    </ModelViewerContext.Provider>
  );
}
