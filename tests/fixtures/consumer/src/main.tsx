import { createRoot } from "react-dom/client";
import { ModelViewer as LazyViewer } from "@/components/ui/model-viewer/lazy";
import { ModelViewerRoot, ModelViewerScene, ModelViewerDefaultToolbar, ModelInspector, useModelViewer } from "@/components/ui/model-viewer";
import "./style.css";
function Capture() {
  const viewer = useModelViewer();
  return <button disabled={!viewer.canCapture} onClick={() => void viewer.capture("download")}>Capture</button>;
}
createRoot(document.getElementById("root")!).render(<>
  <LazyViewer showUi={false} enableCapture><Capture /></LazyViewer>
  <ModelViewerRoot><ModelViewerScene /><ModelViewerDefaultToolbar /></ModelViewerRoot>
  <ModelInspector inspection={{ dimensions: [1, 1, 1], triangles: 0, materials: 0, textures: 0, nodes: [] }} onSelectMesh={() => undefined} />
</>);
