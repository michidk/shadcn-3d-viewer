"use client";

// Keep this entry independent of the eager barrel: no Three/R3F runtime imports.
import { Component, lazy, Suspense, type ReactNode } from "react";
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
    <ImportErrorBoundary className={className} height={height} style={style} onError={props.onError}>
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
    </ImportErrorBoundary>
  );
}

// This boundary lives outside the downloaded module, so it can handle a failed
// chunk request. Reloading also recovers stale chunk URLs after a deployment;
// remounting React.lazy alone would reuse its cached rejection.
class ImportErrorBoundary extends Component<
  Pick<ModelViewerProps, "className" | "height" | "style" | "onError"> & { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { className, height, style } = this.props;
    return (
      <div data-slot="model-viewer-lazy" className={cn("model-viewer", className)} style={{ height, ...style }}>
        <div className="viewer-loader" role="alert">
          <span>Unable to load the viewer.</span>
          <button type="button" className="underline underline-offset-4" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export type { ModelViewerProps } from "./model-viewer-types";
