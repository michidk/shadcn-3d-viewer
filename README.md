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

Listed in the official [shadcn registry directory](https://ui.shadcn.com/docs/directory) as `@3d-viewer`. No registry configuration is required.

Install the viewer into a Base UI shadcn project:

```sh
npx shadcn@latest add @3d-viewer/model-viewer
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

The shadcn CLI copies the viewer source into your project and installs its React Three Fiber dependencies and required shadcn primitives. Review the CLI diff before accepting any overwrite prompts. See [Add the component](#-add-the-component) for selected features and alternative installation options.

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

Toolbars and orientation controls support keyboards. Provide essential model details outside the canvas. Screenshots use `aria-label` as their filename, or `3D model` when it is absent.

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
| `viewCube` | `"drei" \| "asset-studio" \| false` | controlled; use `defaultViewCube` for an initial value |
| `defaultViewCube` | `"drei" \| "asset-studio" \| false` | `"asset-studio"` |
| `onViewCubeChange` | `(viewCube) => void` | none |
| `viewCubePosition` | Gizmo alignment, e.g. `"top-right"`, `"bottom-left"` | `"top-right"` |
| `viewCubeMargin` | `[horizontal, vertical]` pixels | `[64, 64]`; toolbar clearance on narrow viewers |
| `sceneContent` | R3F nodes | none; primary orbit scene only |
| `projection` | `"perspective" \| "orthographic"` | `"perspective"` |
| `inspectorOpen` | `boolean` | controlled; use `defaultInspectorOpen` for an initial value |
| `defaultInspectorOpen` | `boolean` | `false` |
| `onInspectorOpenChange` | `(open) => void` | none |
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

Models release GPU resources when their last mounted consumer leaves. Loader cache entries also clear by default on source replacement or unmount, after the last viewer using that URL leaves. Set `clearCacheOnUnmount={false}` to retain the loader cache for later reuse.

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

`getCameraView()` and `setCameraView({ position, target }, { transition?: boolean })` use world-space coordinates. Transitions default to enabled; the setter returns `false` for invalid views or orbit controls that are not ready. `useModelViewerCamera()` subscribes to live movement and stays `null` until the model has been framed. Use `cameraPreset` for an initial direction, or wait for a non-null camera before sending an arbitrary view. `onCameraChange` fires after movement settles.

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

### Customize local components

Edit your local `button`, `tooltip`, and `dropdown-menu` components to change shared defaults. Use `className`, composed children, and Base UI's `render` prop for individual controls. Custom components passed through `render` must forward refs, handlers, and ARIA attributes.

`ModelInspector` accepts `inspection`, `selectedMesh`, `onSelectMesh`, optional `onClose`, `position` (`left` or `right`), and native aside props. The preset uses `inspectorPosition`. Search includes collapsed nodes; large hierarchies show 200 rows per batch.

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

### Reuse individual controls

The default toolbar uses the same exported menus and camera controls available to your application. Reorder them or leave out features without copying menu markup:

```tsx
import { useModelViewer } from "@/components/ui/model-viewer/core";
import {
  ModelViewerToolbar,
  ModelViewerToolbarGroup,
  ModelViewerShadingMenu,
  ModelViewerCaptureMenu,
} from "@/components/ui/model-viewer/controls";

function CompactControls() {
  const viewer = useModelViewer();
  return (
    <ModelViewerToolbar>
      <ModelViewerToolbarGroup aria-label="Preview">
        <ModelViewerCaptureMenu
          captureDisabled={!viewer.canCapture}
          onCapture={viewer.capture}
        />
        <ModelViewerShadingMenu
          shading={viewer.shading}
          onShadingChange={viewer.setShading}
          className="rounded-none"
        />
      </ModelViewerToolbarGroup>
    </ModelViewerToolbar>
  );
}
```

Also exported: `ModelViewerLightingMenu`, `ModelViewerViewCubeMenu`, and `ModelViewerCameraControls`. Menus forward button props, refs, and `render` to their trigger. Camera controls forward div props to their group. Each accepts explicit state and change callbacks, so they also work outside a viewer root. Wrap standalone controls in your local `TooltipProvider` to share tooltip timing.

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

Custom components passed through `render` must forward the Base UI refs, handlers, and ARIA attributes they receive. Use `className`, `variant`, and `size` to style them.

The hook exposes viewer state and setters, camera commands, `resetView`, `restartAnimation`, `capture`, `toggleFullscreen`, and `status`. Hooks must be used within a root; each root keeps independent state. Status is `idle | loading | ready | error`.

#### State and layout

Controlled props report changes through their corresponding callbacks; the owner must update the prop. For example, use `inspectorOpen` with `onInspectorOpenChange`, or use `defaultInspectorOpen` for uncontrolled state.

Top toolbars reserve space automatically; set `placement="static"` to opt out. Pass `toolbar={null}` to hide the main toolbar or `showUi={false}` to hide all built-in controls. Use the exported `ModelViewerControls` and `ModelViewerAnimationControls` for custom layouts. Toolbar focus supports arrow keys and Home/End.

#### Fullscreen and overlays

Fullscreen controls appear at the bottom-right beside animation controls. Reposition parts with `className` or `style`, and use `viewCubeMargin` to adjust cube spacing.

Built-in menus and tooltips automatically portal into the fullscreen element; custom tooltip portals must target it explicitly. The fullscreen fallback traps focus, makes background content inert, exits with Escape, and restores focus on exit.

DOM parts forward native props, React 19 refs, `className`, and `style`. Viewer `onLoad` and `onError` are model callbacks. Use positioned `children` for DOM overlays and `sceneContent` for R3F nodes.

#### Styling controls

Parts expose stable `data-slot` attributes. The root also exposes `data-state="idle|loading|ready|error"`, while toggle buttons expose `data-state="on|off"`.

Control and inspector presentation uses Tailwind classes beside the JSX. Canvas geometry, fullscreen layout, and animation rules remain in `model-viewer.css`, in Tailwind's `components` layer so utilities can override them. The viewer fills its parent's width and defaults to 620px tall; an explicit `height` prop or inline height overrides height utilities.

`ViewerControlButton` accepts custom `tooltip` content or `false`. Controls default to `type="button"`.

#### Animation and inspection

Omitting `animation` selects the first clip; passing `null` disables selection. Playback starts paused. Reduced motion suppresses playback and rotation unless `respectReducedMotion={false}`.

Inspection uses source-model units and counts unique resources. Select meshes in the hierarchy or scene to outline them. Animation framing samples 17 poses per clip, so fast or procedural motion can exceed the calculated bounds.

## 📦 Add the component

Install from the official registry directory into a Base UI shadcn project:

```sh
npx shadcn@latest add @3d-viewer/model-viewer
```

The `@3d-viewer` namespace is built into the shadcn CLI, so you do not need to add a registry to `components.json`. The CLI copies the component source into your project. Pass shadcn options such as `--dry-run` to preview changes before accepting prompts.

### Install selected features

Choose an item when you do not need the complete preset:

```sh
npx shadcn@latest add @3d-viewer/model-viewer-core
npx shadcn@latest add @3d-viewer/model-viewer-controls
npx shadcn@latest add @3d-viewer/model-viewer-inspector
```

The core provides the renderer, shared state, loading and error states, keyboard orientation, fullscreen, and overlays. It excludes the toolbar and inspector UI. Controls and inspector bundles each include their required core sources, so they can also be installed directly. All items are self-contained within their release and do not fetch a different core version from the main branch. Keep your local changes when the installer prompts about existing files.

Use these imports for a core-only installation:

```tsx
import {
  ModelViewerRoot,
  ModelViewerScene,
  ModelViewerFullscreen,
} from "@/components/ui/model-viewer/core";

<ModelViewerRoot src="/models/chair.glb" aria-label="Lounge chair">
  <ModelViewerScene />
  <ModelViewerFullscreen />
</ModelViewerRoot>
```

Import optional controls from `@/components/ui/model-viewer/controls` and inspector components from `@/components/ui/model-viewer/inspector`. The root barrel and `lazy` preset entry belong to the complete `model-viewer` item. All four bundles currently need the same rendering and shadcn dependencies because the core retains accessible error and orientation controls. The smaller installation reduces source files to maintain, not the renderer's dependency requirements.

### Alternative installation options

You can also install the registry item directly from GitHub without configuring a registry:

```sh
npx shadcn@latest add michidk/shadcn-3d-viewer/model-viewer
```

For a version-pinned install, use the generated registry item from a release tag:

```sh
npx shadcn@latest add https://raw.githubusercontent.com/michidk/shadcn-3d-viewer/v0.2.0/public/r/model-viewer.json
```

The npm installer remains available if you prefer a published package with the exact shadcn version tested for that release:

```sh
npx shadcn-3d-viewer@latest add
```

It installs the generated registry item bundled in its tarball and forwards shadcn options such as `--dry-run`. The package copies source into your app; it is not a compiled library to import from `shadcn-3d-viewer`.

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

### Mesh selection

Use `selectedMesh` and `onSelectedMeshChange` for controlled selection, or omit `selectedMesh` to let the viewer manage it. The callback receives the selected mesh ID or `null`. Resolve IDs against `onInspect`'s `inspection.nodes` to show the name and ancestor hierarchy in your application. IDs belong to the current source; snapshot the source URL/version along with any reference you keep.

```tsx
const [selectedMesh, setSelectedMesh] = useState<string | null>(null);
<ModelViewer
  src={src}
  selectedMesh={selectedMesh}
  onSelectedMeshChange={setSelectedMesh}
  onInspect={setInspection}
/>
```

Click a mesh or choose it in the inspector to select it. Click empty space, use the inspector's clear button, or press Escape with the viewer focused to clear it. Orbit drags do not select objects. Replacing the source, retrying, changing camera mode or unmounting the scene clears selection and reports `null` when there was a selection; controlled owners must accept that update. Selection outlines remain overlays across shading modes and never appear as model parts in inspection.

## Verify consumer compatibility

Run `bun run test:install` to build the registry, pack the installer, and install it into isolated applications outside this repository. The checks build:

- A Vite `base-nova` application with a customized button that must remain unchanged.
- A Vite `base-lyra` application with core alone, then controls, then inspector.
- A Next.js App Router `base-lyra` application that imports eager and lazy viewers from a server page.

The checks also verify that installation preserves the host theme and shadcn configuration. `bun run test:unit` checks every registry item's relative imports and optional-feature boundaries. `bun run test:viewer` and `bun run storybook:test` cover browser behavior and composition.
