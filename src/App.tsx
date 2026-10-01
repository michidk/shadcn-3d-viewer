import { Box, Check, Clipboard, Github, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ModelViewer } from "@/components/ui/model-viewer";

const installCommand = "bunx shadcn@latest add ./public/r/model-viewer.json";
const usageCode = [
  "import { ModelViewer } from",
  "  \"@/components/ui/model-viewer\"",
  "",
  "<ModelViewer",
  "  src=\"/models/chair.glb\"",
  "  height={640}",
  "  lighting=\"day\"",
  "  showGround",
  "  showOrientation",
  "/>",
].join("\n");

export default function App() {
  const [model, setModel] = useState<{ name: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const modelRef = useRef(model);
  modelRef.current = model;

  useEffect(() => () => {
    if (modelRef.current) URL.revokeObjectURL(modelRef.current.url);
  }, []);

  function openFile(file?: File) {
    if (!file || !/\.(glb|gltf)$/i.test(file.name)) return;
    setModel((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { name: file.name, url: URL.createObjectURL(file) };
    });
  }

  function clearModel() {
    setModel((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    if (fileInput.current) fileInput.current.value = "";
  }

  async function copyCommand() {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Frame home">
          <span className="brand-mark"><Box /></span>
          <span>Frame</span>
        </a>
        <div className="header-meta"><span>shadcn/ui</span><span>React Three Fiber</span></div>
        <a className="github-link" href="https://github.com/pmndrs/react-three-fiber" target="_blank" rel="noreferrer"><Github /> <span>R3F</span></a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="eyebrow"><span /> Source-owned 3D</div>
          <h1>A composed model viewer<br /><em>for your interface.</em></h1>
          <p className="lede">A shadcn component for inspecting GLB assets with orbit, four-view, fly camera, shading, lighting, screenshots, and fullscreen controls.</p>
          <div className="install-command">
            <code>{installCommand}</code>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => void copyCommand()} aria-label="Copy install command">
              {copied ? <Check /> : <Clipboard />}
            </Button>
          </div>
        </section>

        <section className="viewer-demo" aria-labelledby="demo-heading">
          <div className="demo-heading">
            <div>
              <p className="section-kicker">Interactive demo</p>
              <h2 id="demo-heading">{model?.name ?? "Material study 01"}</h2>
            </div>
            <div className="file-actions">
              {model && <Button type="button" variant="ghost" size="sm" onClick={clearModel}><X /> Clear</Button>}
              <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}><Upload /> Open model</Button>
              <input ref={fileInput} className="sr-only" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={(event) => openFile(event.target.files?.[0])} />
            </div>
          </div>
          <div
            className={`drop-frame${dragging ? " is-dragging" : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); setDragging(false); openFile(event.dataTransfer.files[0]); }}
          >
            <ModelViewer src={model?.url} alt={model?.name ?? "Abstract sample objects"} showCubes={!model} />
            {dragging && <div className="drop-overlay"><Upload /><span>Drop GLB or glTF to inspect</span></div>}
          </div>
          <p className="local-note">Models stay in your browser. Drop a local GLB onto the viewer to try your own asset.</p>
        </section>

        <section className="feature-grid" aria-label="Viewer features">
          <article><span>01</span><h3>Camera, your way</h3><p>Orbit with bounded zoom, compare four directions, or switch to keyboard-driven fly controls.</p></article>
          <article><span>02</span><h3>Inspect the surface</h3><p>Move between material, solid, normal, and wireframe shading without changing the source asset.</p></article>
          <article><span>03</span><h3>Take the view with you</h3><p>Copy or download a PNG of the live viewport, including all four panes in split mode.</p></article>
        </section>

        <section className="usage" aria-labelledby="usage-heading">
          <div><p className="section-kicker">Small public surface</p><h2 id="usage-heading">Bring a URL.<br />Keep control.</h2><p>The viewer is source code in your app, so its styling and behavior remain yours.</p></div>
          <pre><code>{usageCode}</code></pre>
        </section>
      </main>

      <footer><span>Frame 0.1</span><span>React 19 · Three.js · shadcn/ui</span></footer>
    </div>
  );
}
