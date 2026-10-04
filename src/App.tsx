import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Box,
  Check,
  Clipboard,
  CloudSun,
  GitBranch,
  LayoutGrid,
  Scan,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ModelViewer, ModelViewerSkeleton } from "@/components/ui/model-viewer/lazy";

const installCommand = "npx shadcn-3d-viewer@latest add";
const storybookBase = import.meta.env.DEV
  ? "https://shadcn-3d-viewer.vercel.app/storybook/"
  : "/storybook/";

const featuredStories = [
  {
    id: "viewer-model-viewer--rotating-animated-model",
    label: "Animated model",
    description:
      "Watch the robot animate and rotate, with only its playback controls kept in view.",
    detail: "Playback controls",
    icon: Bot,
    sample: "animated",
  },
  {
    id: "viewer-model-viewer--outside-with-floor",
    label: "Outside lighting",
    description: "See the sky, ground plane, and the model's soft shadow working together.",
    detail: "Scene only",
    icon: CloudSun,
    sample: "outside",
  },
  {
    id: "viewer-model-viewer--four-fixed-views",
    label: "Four fixed views",
    description:
      "Compare the model from four orthographic directions with independent pan and zoom.",
    detail: "Pan + zoom",
    icon: LayoutGrid,
    sample: "split",
  },
  {
    id: "viewer-model-viewer--minimal-embed",
    label: "Minimal embed",
    description: "Use the renderer as a quiet preview with only fullscreen kept in view.",
    detail: "Fullscreen only",
    icon: Scan,
    sample: "minimal",
  },
] as const;

function UsageCode() {
  return (
    <pre className="usage-code">
      <code>
        <span className="syntax-keyword">import</span>
        {" { "}
        <span className="syntax-name">ModelViewer</span>
        {" } "}
        <span className="syntax-keyword">from</span>
        {"\n"}
        {"  "}
        <span className="syntax-string">"@/components/ui/model-viewer"</span>
        {"\n\n"}
        <span className="syntax-punctuation">{"<"}</span>
        <span className="syntax-name">ModelViewer</span>
        {"\n"}
        {"  "}
        <span className="syntax-property">src</span>=
        <span className="syntax-string">"/models/chair.glb"</span>
        {"\n"}
        {"  "}
        <span className="syntax-property">height</span>={"{"}
        <span className="syntax-number">640</span>
        {"}"}
        {"\n"}
        {"  "}
        <span className="syntax-property">lighting</span>=
        <span className="syntax-string">"day"</span>
        {"\n"}
        {"  "}
        <span className="syntax-property">showOrientation</span>
        {"\n"}
        <span className="syntax-punctuation">{"/>"}</span>
      </code>
    </pre>
  );
}

function SampleFrame({ sample }: { sample: string }) {
  if (sample === "animated") {
    return (
      <div className="sample-frame-shell">
        <ModelViewer
          src="/models/robot-expressive.glb"
          aria-label="Animated robot sample"
          height="100%"
          defaultAutoRotate
          defaultAnimation="Walking"
          defaultAnimationPlaying
          toolbar={null}
          viewCube={false}
          showOrientation={false}
        />
      </div>
    );
  }
  if (sample === "outside") {
    return (
      <div className="sample-frame-shell">
        <ModelViewer
          src="/models/robot-expressive.glb"
          aria-label="Outside lighting sample"
          height="100%"
          lighting="outside"
          defaultShowFloor
          toolbar={null}
          showAnimationControls={false}
          viewCube={false}
          showOrientation={false}
        />
      </div>
    );
  }
  if (sample === "split") {
    return (
      <div className="sample-frame-shell">
        <ModelViewer
          aria-label="Four fixed views sample"
          height="100%"
          mode="split"
          projection="orthographic"
          showGrid
          toolbar={null}
          showAnimationControls={false}
          viewCube={false}
          showOrientation={false}
        />
      </div>
    );
  }
  return (
    <div className="sample-frame-shell sample-frame-minimal">
      <ModelViewer
        aria-label="Minimal 3D sample"
        height="100%"
        toolbar={null}
        showAnimationControls={false}
        showOrientation={false}
        viewCube={false}
      />
    </div>
  );
}

function LandingPage() {
  const [model, setModel] = useState<{ name: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [featuredStory, setFeaturedStory] = useState<(typeof featuredStories)[number]>(
    featuredStories[0],
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const modelRef = useRef(model);

  useEffect(
    () => () => {
      if (modelRef.current?.url.startsWith("blob:")) URL.revokeObjectURL(modelRef.current.url);
    },
    [],
  );

  function openFile(file?: File) {
    if (!file || !/\.glb$/i.test(file.name)) return;
    replaceModel({ name: file.name, url: URL.createObjectURL(file) });
  }

  function replaceModel(next: typeof model) {
    if (modelRef.current?.url.startsWith("blob:")) URL.revokeObjectURL(modelRef.current.url);
    modelRef.current = next;
    setModel(next);
  }

  function clearModel() {
    replaceModel(null);
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
        <a className="brand" href="#top" aria-label="shadcn-3d-viewer home">
          <span className="brand-mark">
            <Box />
          </span>
          <span>shadcn-3d-viewer</span>
        </a>
        <nav className="header-links" aria-label="Project links">
          <a href={storybookBase}>
            <BookOpen aria-hidden="true" /> <span>Storybook</span>
          </a>
          <a
            href="https://github.com/michidk/shadcn-3d-viewer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitBranch aria-hidden="true" /> <span>GitHub</span>
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="eyebrow">
            <span /> Source-owned 3D
          </div>
          <h1>
            A composed model viewer
            <br />
            <em>for your interface.</em>
          </h1>
          <p className="lede">
            A shadcn component for inspecting GLB assets with orbit, four-view, fly camera,
            animation playback, studio lighting, screenshots, and fullscreen controls.
          </p>
          <div className="install-command">
            <code>{installCommand}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void copyCommand()}
              aria-label="Copy install command"
            >
              {copied ? <Check /> : <Clipboard />}
            </Button>
          </div>
        </section>

        <section className="viewer-demo" aria-labelledby="demo-heading">
          <div className="demo-heading">
            <div>
              <p className="section-kicker">Interactive demo</p>
              <h2 id="demo-heading">{model?.name ?? "Material study 01"}</h2>
              <p className="demo-subtitle">
                Try it here, then browse every state and composition in Storybook.
              </p>
            </div>
            <div className="demo-actions">
              <Button
                className="storybook-demo-link"
                nativeButton={false}
                size="sm"
                render={<a href={storybookBase} target="_blank" rel="noopener noreferrer" />}
              >
                <BookOpen aria-hidden="true" />
                Explore Storybook
                <ArrowUpRight aria-hidden="true" />
              </Button>
              <div className="file-actions">
                {model && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearModel}>
                    <X /> Clear
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                >
                  <Upload /> Open model
                </Button>
                <input
                  ref={fileInput}
                  className="sr-only"
                  type="file"
                  accept=".glb,model/gltf-binary"
                  onChange={(event) => openFile(event.target.files?.[0])}
                />
              </div>
            </div>
          </div>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Drag/drop supplements the keyboard-accessible file upload button. */}
          <div
            className={`drop-frame${dragging ? " is-dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              openFile(event.dataTransfer.files[0]);
            }}
          >
            <ModelViewer
              src={model?.url}
              aria-label={model?.name ?? "Abstract sample objects"}
              showCubes={!model}
              defaultAutoRotate
              loadingFallback={<ModelViewerSkeleton />}
            />
            {dragging && (
              <div className="drop-overlay">
                <Upload />
                <span>Drop a GLB to inspect</span>
              </div>
            )}
          </div>
          <p className="local-note">
            Models stay in your browser. Drop a local GLB onto the viewer to try your own asset.
          </p>
        </section>

        <section className="feature-grid" aria-label="Viewer features">
          <article>
            <span>01</span>
            <h3>Camera, your way</h3>
            <p>
              Orbit with bounded zoom, compare four directions, or switch to keyboard-driven fly
              controls.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Inspect the surface</h3>
            <p>
              Move between material, solid, normal, and wireframe shading without changing the
              source asset.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Take the view with you</h3>
            <p>
              Copy or download a PNG of the live viewport, including all four panes in split mode.
            </p>
          </article>
        </section>

        <section className="usage" aria-labelledby="usage-heading">
          <div>
            <p className="section-kicker">Small public surface</p>
            <h2 id="usage-heading">
              Bring a URL.
              <br />
              Keep control.
            </h2>
            <p>The viewer is source code in your app, so its styling and behavior remain yours.</p>
          </div>
          <UsageCode />
        </section>

        <section className="story-showcase" aria-labelledby="stories-heading">
          <div className="story-showcase-heading">
            <div>
              <p className="section-kicker">More ways to compose</p>
              <h2 id="stories-heading">See it in action.</h2>
              <p>{featuredStory.description}</p>
            </div>
            <a
              href={`${storybookBase}?path=/story/${featuredStory.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Storybook <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
          <div className="story-browser">
            <div className="story-options" role="listbox" aria-label="Featured Storybook examples">
              <p>Samples</p>
              {featuredStories.map((story) => {
                const Icon = story.icon;
                return (
                  <button
                    key={story.id}
                    type="button"
                    role="option"
                    aria-selected={story.id === featuredStory.id}
                    onClick={() => setFeaturedStory(story)}
                  >
                    <span className="story-option-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="story-option-copy">
                      <strong>{story.label}</strong>
                      <small>{story.detail}</small>
                    </span>
                    <ArrowUpRight aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <div className="story-stage">
              <div className="story-stage-meta">
                <span>Live sample</span>
                <strong>{featuredStory.label}</strong>
              </div>
              <div className="story-frame">
                <iframe
                  key={featuredStory.id}
                  title={`${featuredStory.label} Storybook example`}
                  src={`?sample=${featuredStory.sample}`}
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const sample = new URLSearchParams(window.location.search).get("sample");
  return sample ? <SampleFrame sample={sample} /> : <LandingPage />;
}
