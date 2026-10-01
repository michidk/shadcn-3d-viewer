"use client";

// Keep this entry independent of the eager barrel: no Three/R3F runtime imports.
import { lazy, Suspense, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelViewerProps } from "./model-viewer-types";
import "./model-viewer.css";

const Viewer = lazy(() => import("./model-viewer").then((module) => ({ default: module.ModelViewer })));

export type LazyModelViewerProps = ModelViewerProps & {
  /** Placeholder for the JavaScript download, before a viewer context exists. */
  importFallback?: ReactNode;
};

/** Loads the renderer chunk only when mounted. Use this entry for optional embeds. */
export function ModelViewer({ importFallback, ...props }: LazyModelViewerProps) {
  const { className, height, style } = props;
  return (
    <Suspense fallback={
      <div data-slot="model-viewer-lazy" className={cn("model-viewer", className)} style={{ height, ...style }}>
        {importFallback !== undefined ? importFallback : (
          <div className="viewer-loader" role="status">
            <LoaderCircle className="viewer-loader-spinner" aria-hidden="true" />
            <span>Loading viewer…</span>
          </div>
        )}
      </div>
    }>
      <Viewer {...props} />
    </Suspense>
  );
}

export type { ModelViewerProps } from "./model-viewer-types";
