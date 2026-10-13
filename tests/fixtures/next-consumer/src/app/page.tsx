import { ModelViewer } from "@/components/ui/model-viewer";
import { ModelViewer as LazyViewer } from "@/components/ui/model-viewer/lazy";

export default function Page() {
  return (
    <main>
      <h1>Server-rendered viewer consumer</h1>
      <ModelViewer aria-label="Eager viewer" />
      <LazyViewer aria-label="Lazy viewer" />
    </main>
  );
}
