<!-- markdownlint-disable MD033 -->
<h1 align="center">shadcn-3d-viewer</h1>

<p align="center">
  <strong>A source-owned 3D model viewer for shadcn/ui.</strong><br>
  Inspect, animate, compose, and capture GLB models with React Three Fiber—without giving up control of the source.
</p>

<p align="center">
  <a href="https://shadcn-3d-viewer.vercel.app/">Live demo</a>
  &nbsp;·&nbsp;
  <a href="https://shadcn-3d-viewer.vercel.app/storybook/">Storybook</a>
  &nbsp;·&nbsp;
  <a href="#-quick-start">Quick start</a>
  &nbsp;·&nbsp;
  <a href="#-api-and-composition">API</a>
</p>

<p align="center">
  <a href="https://github.com/michidk/shadcn-3d-viewer/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/michidk/shadcn-3d-viewer/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white">
  <img alt="React Three Fiber" src="https://img.shields.io/badge/React_Three_Fiber-000000?logo=threedotjs&logoColor=white">
</p>

---

## 🧊 What it is

`shadcn-3d-viewer` is a production-minded shadcn component for viewing GLB models. It is adapted from Asset Studio's model viewer and presented here with an interactive Vite demo and a comprehensive Storybook.

- 🎛️ **A complete viewer, not just a canvas.** Orbit, split, and first-person cameras; studio and outdoor lighting; four shading modes; animation controls; screenshots; fullscreen; and a searchable scene inspector.
- 🧩 **Composable by design.** Use the ready-made `ModelViewer`, arrange compound parts yourself, or connect custom controls through `useModelViewer()`.
- 🎨 **Source-owned and theme-aware.** shadcn installs the component into your application, where it uses your local Base UI primitives and semantic theme tokens.
- ⚡ **Built for real interfaces.** Lazy loading, demand-driven rendering, offscreen pausing, reduced-motion support, resilient error states, and responsive controls are included.
- ♿ **Accessible around the canvas.** ARIA naming, keyboard-operable toolbars and orientation controls, focus-managed fullscreen, and hooks for meaningful text descriptions.

> [!TIP]
> **Try it before installing.** Open the [live demo](https://shadcn-3d-viewer.vercel.app/), then drop in a local `.glb` file. The model stays in your browser.

## 🚀 Quick start

Install the viewer into a Base UI shadcn project:

```sh
npx shadcn-3d-viewer@latest add
```

Then render it from the source now owned by your app:

```tsx
import { ModelViewer } from "@/components/ui/model-viewer";

export function Preview() {
  return (
    <ModelViewer
      src="/models/chair.glb"
      aria-label="Walnut lounge chair"
      height={640}
      lighting="day"
      showOrientation
      defaultViewCube="drei"
      defaultProjection="perspective"
      onLoad={() => console.log("ready")}
    />
  );
}
```

The npm installer uses the shadcn version tested with this release and installs the viewer's React Three Fiber dependencies and required shadcn primitives. Review the CLI diff before accepting any overwrite prompts. See [Add the component](#-add-the-component) for registry URL, namespace, version-pinned, and local installation options.

Use compatible **Base UI** shadcn primitives with the `render` composition API. The viewer inherits your theme; 3D lighting is independent of light/dark mode.

## ✨ Feature set

- Smooth camera controls, bounded zoom, and a single orthographic projection toggle
- Optional orientation helper: Drei's labeled cube or Asset Studio's colored axes
- Four fixed front/right/back/left views with independent pan and zoom, sharing one WebGL renderer
- First-person fly camera with pointer-lock and drag-look fallback
- Realistic, solid, normal, and wireframe shading
- Procedural image-based studio lighting, day/night modes, and an optional fading grid
- GLTF animation clip selection, playback, restart, looping, and speed controls
- Clipboard and downloadable PNG captures
- Fullscreen with an in-page fallback
- Loading progress, posters, custom fallbacks, and error states
- Performance-based pixel ratio (1–2×, without pixelated drag mode), reduced-motion support, and demand-driven rendering
- Draco, Meshopt, and custom loader configuration
- Optional UI-free mode for cards and compact previews
- Model dimensions, triangle/material/texture counts, selectable meshes, and scene hierarchy

## 🧩 API and composition

Omit `src` to render the built-in material study. Use `showUi={false}` for a clean embedded preview.

### Accessibility

Name the viewer with `aria-label` or `aria-labelledby`. Use `aria-describedby` to link essential visual details in nearby text.

```tsx
<h2 id="chair-heading">Walnut lounge chair</h2>
<ModelViewer
  src="/models/chair.glb"
  aria-labelledby="chair-heading"
  aria-describedby="chair-description"
/>
<p id="chair-description">
  A low-backed chair with curved walnut arms and cream upholstery.
</p>
```

`alt` remains a fallback accessible name and screenshot filename. Toolbars and orientation controls support keyboards; provide essential model details outside the canvas.

### Load the renderer on demand

```tsx
import { ModelViewer } from "@/components/ui/model-viewer/lazy";

// No renderer chunk is requested until this component is mounted.
{open && <ModelViewer src="/models/chair.glb" height={420} />}
```

For a placeholder shaped like the viewer, use `ModelViewerSkeleton`. It has no Three.js imports and fills its nearest positioned ancestor:

```tsx
import { ModelViewer, ModelViewerSkeleton } from "@/components/ui/model-viewer/lazy";

<ModelViewer
  src="/models/chair.glb"
  loadingFallback={<ModelViewerSkeleton />}
/>
```

Set `showToolbar={false}` or `showViewCube={false}` to match a minimal embed.

The lazy entry defers the renderer until mount. `loadingFallback` and `poster` cover both the chunk download and model loading. Chunk failures call `onError` and offer a page reload; model failures use `errorFallback` and retry. Importing the eager barrel elsewhere can load the renderer early.

### Props

| Prop | Type | Default |
| --- | --- | --- |
| `src` | `string` | built-in sample |
| `aria-label` / `aria-labelledby` | accessible name | `"3D model"` when neither is supplied |
| `aria-describedby` | IDs of text describing the model | none |
| `alt` | legacy accessible-name fallback | deprecated; use ARIA naming props |
| `height` | CSS height | `620` |
| `mode` | `orbit \| split \| firstPerson` | `orbit` |
| `lighting` | `day \| night \| outside` | `day` |
| `shading` | `realistic \| solid \| normals \| wireframe` | `realistic` |
| `showGrid` | `boolean` | `false` |
| `showFloor` | `boolean` | `false` |
| `defaultShowFloor` | `boolean` | `false`; initial uncontrolled floor visibility |
| `floorColor` | CSS color | current background/horizon color |
| `showUi` | `boolean` | `true` |
| `showOrientation` | `boolean` | follows `showUi` |
| `viewCube` | `"drei" \| "asset-studio" \| false` | `"asset-studio"` |
| `viewCubePosition` | Gizmo alignment, e.g. `"top-right"`, `"bottom-left"` | `"top-right"` |
| `viewCubeMargin` | `[horizontal, vertical]` pixels | `[64, 64]`; toolbar clearance on narrow viewers |
| `sceneContent` | R3F nodes | none; primary orbit scene only |
| `projection` | `"perspective" \| "orthographic"` | `"perspective"` |
| `showInspector` | `boolean` | `false` |
| `onInspect` | `(inspection: ModelInspection) => void` | none |
| `autoRotate` | `boolean` | `false` |
| `defaultAutoRotate` | `boolean` | `false`; initial uncontrolled rotation |
| `onAutoRotateChange` | `(rotating: boolean) => void` | none |
| `autoRotateSpeed` | radians per second | `0.15` |
| `cameraPreset` | `isometric \| front \| right \| back \| left \| top \| bottom` | `isometric` |
| `animation` | clip name or `null` | first available clip |
| `defaultAnimation` | clip name or `null` | first available clip |
| `animationPlaying` | `boolean` | `false` |
| `defaultAnimationPlaying` | `boolean` | `false` |
| `animationSpeed` | `number` | `1` |
| `environment` | `boolean` | `true` |
| `poster` | image URL | none |
| `showFileName` | `boolean` | `false` (default loader only) |
| `loadingFallback` | node or progress renderer | spinner and loading label |
| `errorFallback` | node or error renderer | concise error card |
| `showRetry` | `boolean` | `false` |
| `pauseWhenHidden` | `boolean` | `true` |

Set `showFileName` to show the source in the default loader. Custom loaders receive `{ active, progress, item, loaded, total }`; `item` is this viewer’s `src` and numeric progress is indeterminate (zero). Use `onError` for technical details. Pass `null` to hide either fallback.

`showRetry` or `useModelViewer().retry()` retries a failed model, clears its loader cache, and remounts the renderer. Replace `src` to fix an invalid or expired URL.

`pauseWhenHidden` pauses rendering, animation, and rotation offscreen or in a hidden tab, preserving playback state. Loading continues. Read `renderingPaused` or `data-rendering="paused|active"` for the effective state.

```tsx
<ModelViewer
  src="/models/chair.glb"
  loadingFallback={<MySpinner />}
  errorFallback={() => <p role="alert">Preview unavailable.</p>}
/>
```

State props are controlled when supplied; use corresponding `default*` props for initial uncontrolled values and change callbacks to handle toolbar actions. Auto-rotation applies only in orbit mode.

`showFloor` adds a shadow-receiving ground plane; `floorColor` overrides its color. Outside lighting uses a procedural sky. Realistic shading preserves materials; Solid replaces them with matte gray.

To start an animated model rotating and playing a particular clip:

```tsx
<ModelViewer
  src="/models/robot-expressive.glb"
  defaultAutoRotate
  defaultAnimation="Walking"
  defaultAnimationPlaying
/>
```

Use the toolbar for orthographic projection and the orientation helper or `cameraPreset` for direction. Helpers appear in orbit mode; `viewCube={false}` hides them and explicit `showOrientation` enables them with `showUi={false}`.

Use the exported `ViewCube` in an R3F `Canvas` with default camera controls, or configure it through the viewer:

```tsx
<ModelViewer defaultViewCube="drei" viewCubePosition="top-right" viewCubeMargin={[64, 80]} />

// Inside an R3F Canvas:
<ViewCube variant="asset-studio" position="top-right" margin={[64, 64]} />
```

Standalone `ViewCube` uses render priority 1; set a later priority with custom renderers (the viewer uses 2). Split panes have fixed directions with pan and zoom.

Replace the cube with custom R3F content:

```tsx
<ModelViewer
  src="/models/chair.glb"
  viewCube={false}
  sceneContent={<MyR3FViewCube />}
/>
```

`sceneContent` renders in the primary orbit pane only. `children` and `overlay` are DOM content. Custom gizmos need equivalent keyboard controls.

`getCameraView()` and `setCameraView({ position, target }, { transition?: boolean })` use world-space coordinates. Transitions default to enabled; the setter returns `false` for invalid views or unmounted orbit controls. `useModelViewerCamera()` subscribes to live movement (initially `null`); `onCameraChange` fires after movement settles.

```tsx
function CustomDirectionButton() {
  const viewer = useModelViewer();
  const camera = useModelViewerCamera();
  return <button type="button" disabled={!camera} onClick={() => {
    if (!camera) return;
    const [x, y, z] = camera.target;
    viewer.setCameraView({ position: [x + 3, y + 2, z + 4], target: camera.target });
  }}>Three-quarter view</button>;
}
```

Tab to **Orient view** for keyboard direction controls. The menu supports Enter/Space, arrows, Home/End, and Escape. `ModelViewerScene` includes it automatically when the cube is enabled in orbit mode; standalone `ViewCube` needs host DOM controls.

### Compatibility component overrides

Prefer local primitives and composed parts. Use `components` for application-wide overrides:

```tsx
<ModelViewer components={{ Button: AppButton, Tooltip: AppTooltip }} />
```

`Button` must forward Base UI props, refs, handlers, ARIA attributes, and `className`. `Tooltip` receives `{ content, children }`; compose with `<TooltipTrigger render={children} />`. See `ViewerUiComponents` and `ViewerTooltipProps`. Define overrides outside render.

`ModelInspector` accepts `inspection`, `selectedMesh`, `onSelectMesh`, optional `onClose`, `position` (`left` or `right`), `className`, and `components`. The preset uses `inspectorPosition`. Search includes collapsed nodes; large hierarchies show 200 rows per batch. `ViewerUiProvider` shares overrides across controls.

### Compose viewer parts

`ModelViewer` is a preset, not a separate implementation. Build your own arrangement from the same parts:

```tsx
import {
  ModelViewerRoot,
  ModelViewerScene,
  ModelViewerDefaultToolbar,
  ModelViewerAnimationBar,
  ModelViewerInspector,
  ModelViewerStatus,
  ModelViewerFullscreen,
} from "@/components/ui/model-viewer";

<ModelViewerRoot src="/models/chair.glb" height={640}>
  <ModelViewerScene />
  <ModelViewerDefaultToolbar />
  <ModelViewerAnimationBar />
  <ModelViewerInspector />
  <ModelViewerStatus />
  <ModelViewerFullscreen />
</ModelViewerRoot>
```

The root owns state and its DOM container. Mount exactly one `ModelViewerScene`; add other parts as needed. The scene handles rendering and loading/error states. Animation and inspector parts appear when their data is available.

`ModelViewerRoot` accepts state props, native DOM props, and refs. Compose children instead of preset-only `toolbar`, `overlay`, and `showAnimationControls`. Root `showUi` does not hide explicitly mounted children.

### Build controls with shared state

`useModelViewer()` returns state and actions for the nearest root (including the root inside the preset). No callback plumbing is needed:

```tsx
import { Grid2X2 } from "lucide-react";
import {
  ModelViewer,
  ModelViewerToolbar,
  ModelViewerToolbarGroup,
  ModelViewerToolbarButton,
  useModelViewer,
} from "@/components/ui/model-viewer";

function CompactToolbar() {
  const { showGrid, setShowGrid } = useModelViewer();

  return (
    <ModelViewerToolbar aria-label="Preview controls">
      <ModelViewerToolbarGroup aria-label="Display">
        <ModelViewerToolbarButton
          label="Show grid"
          active={showGrid}
          onClick={() => setShowGrid(!showGrid)}
          render={<button className="rounded-full" />}
        >
          <Grid2X2 />
        </ModelViewerToolbarButton>
      </ModelViewerToolbarGroup>
    </ModelViewerToolbar>
  );
}

<ModelViewer toolbar={<CompactToolbar />} />
```

`render` preserves Base UI refs, handlers, and ARIA attributes. Custom components must forward them. Use `className`, `variant`, and `size` for styling.

The hook exposes viewer state and setters, camera commands, `resetView`, `restartAnimation`, `capture`, `toggleFullscreen`, and status. Each root is independent; hooks require a root. `status` is `idle | loading | ready | error`.

Controlled actions report change callbacks; the owner must update the prop. Prefer `inspectorOpen` / `onInspectorOpenChange` or `defaultInspectorOpen`; legacy `showInspector` still works.

Top toolbars reserve space automatically. Use `placement="static"` to opt out.

Custom tooltip portals must target the fullscreen element. Built-in menus and tooltips do this automatically.

The fullscreen fallback traps focus, makes background content inert, exits with Escape, and restores focus.

Fullscreen defaults to bottom-right, beside animation controls. Reposition parts with `className` or `style`; use `viewCubeMargin` for cube spacing.

`toolbar={null}` hides the main toolbar; `showUi={false}` hides built-in controls. Exported `ModelViewerControls` and `ModelViewerAnimationControls` support custom layouts. Toolbar focus uses arrows and Home/End.

DOM parts forward native props, React 19 refs, `className`, and `style`. Viewer `onLoad`/`onError` are model callbacks. Use positioned `children` for DOM overlays and `sceneContent` for R3F nodes.

Style parts through stable `data-slot` attributes. The root exposes `data-state="idle|loading|ready|error"`; toggle buttons expose `data-state="on|off"`.

Styles use Tailwind’s `components` layer and shadcn tokens, so utilities can override them. Width fills the parent; default height is 620px. Explicit `height` or inline height overrides height utilities.

`ViewerControlButton` supports custom `tooltip` content or `false`. Controls default to `type="button"`.

Omitting `animation` selects the first clip; `null` disables selection. Playback starts paused. Reduced motion suppresses playback and rotation unless `respectReducedMotion={false}`.

Inspection uses source-model units and counts unique resources. Select meshes in the hierarchy or scene to outline them. Animation framing samples 17 poses per clip; fast or procedural motion can exceed those bounds.

## 📦 Add the component

Install the published package into a Base UI shadcn project:

```sh
npx shadcn-3d-viewer@latest add
```

The npm package is a small installer for the included shadcn registry item. It runs the exact `shadcn` version this release was built and tested with (not `shadcn@latest`) and copies the component source into your project; it is **not** a compiled library to import from `shadcn-3d-viewer`. Pass shadcn options through—for example, `npx shadcn-3d-viewer@latest add --dry-run`—and review changes before accepting prompts.

You can also install the registry item directly from GitHub without configuring a registry:

```sh
npx shadcn@latest add michidk/shadcn-3d-viewer/model-viewer
```

For a version-pinned install, use the generated registry item from a release tag:

```sh
npx shadcn@latest add https://raw.githubusercontent.com/michidk/shadcn-3d-viewer/v0.2.0/public/r/model-viewer.json
```

You can also configure the hosted registry under a short local namespace. Add this to your app's `components.json`, then run `npx shadcn@latest add @viewer/model-viewer`:

```json
{
  "registries": {
    "@viewer": "https://raw.githubusercontent.com/michidk/shadcn-3d-viewer/main/public/r/{name}.json"
  }
}
```

The npm installer uses the same generated item from its tarball.

To install from a local checkout, build the shadcn registry item, then add it from another shadcn project:

```sh
bun run registry:build
bunx shadcn@latest add /absolute/path/to/shadcn-3d-viewer/public/r/model-viewer.json
```

Use a Base UI shadcn project with the button `variant`/`size`, tooltip `render`, and dropdown radio APIs (the demo uses `"style": "base-nova"` in `components.json`). Any compatible Base UI shadcn style and palette can be used. The registry item installs its React Three Fiber dependencies and the shadcn `alert`, `button`, `tooltip`, and `dropdown-menu` primitives. Radix versions of these controls are not interchangeable with the Base UI composition API. Installation contains only viewer sources and references to your local primitives: it does **not** install `src/theme.css`, set CSS variables, overwrite `components.json`, or select a palette. Do not overwrite your customized primitives when the shadcn CLI prompts.

Or copy `src/components/ui/model-viewer/` into an existing shadcn project and install:

```sh
bun add @react-three/fiber @react-three/drei three three-stdlib lucide-react
bun add -d @types/three
```

## Development checks

Install dependencies with `bun install --frozen-lockfile`, then install the browser and its system dependencies with `bunx playwright install --with-deps chromium`.

Run `bun run check:ci` for the same checks used by CI: registry freshness, typechecking, Biome, production build, package tests, installation into an independent consumer, viewer tests, Storybook tests, and the Storybook build. The browser suites start and stop their own servers. Set `VIEWER_TEST_URL` or `STORYBOOK_TEST_URL` to test an existing server instead; `VIEWER_TEST_CDP` optionally connects to an existing Chromium instance.

For a faster development loop, use `bun run test:unit` (no browser or server required), `bun run test:viewer`, or `bun run verify`. Typechecking includes the app, test suites, and build/test configuration. Tests live in `tests/unit/` for pure logic and `tests/viewer/` for browser behavior grouped by feature. Shared browser setup lives in `tests/fixtures/browser.ts`.

Biome owns formatting, import organization, React hook checks, and promise linting. Run `bun run format` to format files or `bunx biome check --write .` to apply safe lint fixes. Promise rules use Biome's type inference and complement the strict TypeScript check. Effect dependencies may deliberately trigger scene resets or redraws without being read by the callback. Non-null assertions and CSS cascade choices remain permitted; the Three.js scene has a scoped DOM-accessibility exception because its JSX renders WebGL objects.

After changing viewer sources, run `bun run registry:build` and commit the generated `public/r/` files. `bun run registry:check` rebuilds and fails if the previous artifacts were stale, so run it before packaging. The runtime composes preference, model-session, and browser-interaction hooks; keep load-derived resets in `use-viewer-session.ts` and cover lifecycle transitions in `tests/unit/lifecycle.spec.ts`.

## 📝 Implementation notes

- The demo intentionally accepts GLB only because standalone `.gltf` files can reference sidecar buffers and textures. The component itself can load any URL supported by `GLTFLoader`.
- Draco and Meshopt are enabled by default. Pass a self-hosted Draco decoder path through `useDraco`, or configure KTX2 and other extensions with `extendLoader`.
- GPU geometry, material, texture, and skeleton allocations are released after their last mounted viewer or pane unmounts. Cached model objects and image sources remain reusable. Blob URLs also clear Drei's loader cache on unmount by default; set `clearCacheOnUnmount` explicitly for other short-lived URLs.
- Animation rendering stops when a non-looping clip finishes or playback speed is zero. Restarting or resuming playback wakes the demand loop; auto-rotation continues to request frames independently.
- `enableCapture` controls PNG capture independently of the built-in UI and defaults to `showUi`. Use `<ModelViewer showUi={false} enableCapture>` for custom capture controls, or `enableCapture={false}` to reduce GPU overhead with the toolbar visible. `canCapture` stays false until the renderer supports capture and the model is ready. Changing `enableCapture` recreates the WebGL canvas because buffer preservation is fixed when its context is created.
- First-person pointer lock may be blocked inside restrictive iframes; the component automatically falls back to focused-canvas drag look when the browser exposes that policy.
