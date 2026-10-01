# Frame — shadcn 3D viewer

A source-owned shadcn component for viewing GLB models with React Three Fiber. It is adapted from Asset Studio's production model viewer and presented in a standalone Vite demo.

## Features

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

## Run it

```sh
bun install
bun run dev
```

Production checks:

```sh
bun run verify
```

## Add the component

This repository includes a shadcn registry manifest. Build the local registry, then install the component into another shadcn project:

```sh
bun run registry:build
bunx shadcn@latest add ./public/r/model-viewer.json
```

The registry item installs its React Three Fiber dependencies and the shadcn `alert`, `button`, `tooltip`, and `dropdown-menu` primitives.

Or copy `src/components/ui/model-viewer/` into an existing shadcn project and install:

```sh
bun add @react-three/fiber @react-three/drei three three-stdlib lucide-react
bun add -d @types/three
```

## Usage

```tsx
import { ModelViewer } from "@/components/ui/model-viewer";

export function Preview() {
  return (
    <ModelViewer
      src="/models/chair.glb"
      alt="Walnut lounge chair"
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

Omit `src` to render the built-in material study. Use `showUi={false}` for a clean embedded preview.

### Props

| Prop | Type | Default |
| --- | --- | --- |
| `src` | `string` | built-in sample |
| `height` | CSS height | `620` |
| `mode` | `orbit \| split \| firstPerson` | `orbit` |
| `lighting` | `day \| night` | `day` |
| `shading` | `realistic \| solid \| normals \| wireframe` | `realistic` |
| `showGrid` | `boolean` | `false` |
| `showUi` | `boolean` | `true` |
| `showOrientation` | `boolean` | follows `showUi` |
| `viewCube` | `"drei" \| "asset-studio" \| false` | `"asset-studio"` |
| `viewCubePosition` | Gizmo alignment, e.g. `"top-right"`, `"bottom-left"` | `"top-right"` |
| `viewCubeMargin` | `[horizontal, vertical]` pixels | `[64, 64]`; toolbar clearance on narrow viewers |
| `projection` | `"perspective" \| "orthographic"` | `"perspective"` |
| `showInspector` | `boolean` | `false` |
| `onInspect` | `(inspection: ModelInspection) => void` | none |
| `autoRotate` | `boolean` | `false` |
| `cameraPreset` | `isometric \| front \| right \| back \| left \| top \| bottom` | `isometric` |
| `animation` | clip name or `null` | first available clip |
| `animationPlaying` | `boolean` | `false` |
| `animationSpeed` | `number` | `1` |
| `environment` | `boolean` | `true` |
| `poster` | image URL | none |
| `loadingFallback` | node or progress renderer | built-in progress |
| `errorFallback` | node or error renderer | built-in alert |

`mode`, `lighting`, `shading`, `showGrid`, `viewCube`, `projection`, camera, and animation props are controlled when supplied. Use their corresponding `default*` props for uncontrolled initial values. Change callbacks report toolbar interactions. In particular, use `onViewCubeChange` and `onProjectionChange` when controlling these options externally.

The toolbar offers one orthographic toggle; direction changes are available through the orientation helper. `cameraPreset` remains available for programmatic positioning. Helpers appear in orbit mode. Set `viewCube={false}` to hide one, or explicitly set `showOrientation` to show it in a UI-free viewer.

`ViewCube` is also an exported, source-owned shadcn-style component. Compose it inside your own React Three Fiber `Canvas` with default camera controls, or configure it through `ModelViewer`:

```tsx
<ModelViewer defaultViewCube="drei" viewCubePosition="top-right" viewCubeMargin={[64, 80]} />

// Inside an R3F Canvas:
<ViewCube variant="asset-studio" position="top-right" margin={[64, 64]} />
```

Standalone `ViewCube` defaults to render priority 1. When composing with a custom renderer, use a later priority (the viewer uses 2). The four split panes keep fixed directions; dragging pans and scrolling zooms without rotating them.

### Bring your own UI

Controls include accessible tooltips by default. Replace either implementation without changing the viewer:

```tsx
<ModelViewer components={{ Button: AppButton, Tooltip: AppTooltip }} />
```

`Button` accepts the shadcn button props (including `variant` and `size`) and must forward its ref, event handlers, ARIA attributes, and `className` to the actual button. `Tooltip` receives `{ content, children }`; use `children` as its trigger while preserving refs and handlers. Exported `ViewerUiComponents` and `ViewerTooltipProps` describe these contracts. Define overrides outside render to preserve component identity.

`ModelInspector` is separately exported with searchable/collapsible hierarchy, metric cards, dimensions, and selection state. Pass `inspection`, `selectedMesh`, `onSelectMesh`, optional `onClose`, `className`, and optional `components`. Use `ViewerUiProvider` to share overrides across composed controls. The inspector includes its stylesheet; override `className`/CSS for custom placement.

Omitting `animation` automatically selects the first clip; passing `animation={null}` explicitly disables clip selection. Playback starts paused. Clip selection resets when replacing an uncontrolled model, and pause/resume preserves playback position. Respecting reduced motion suppresses playback and auto-rotation; use `respectReducedMotion={false}` only when your application explicitly requests motion.

The inspector reports source-model units and unique material/texture resources. Select a mesh in the hierarchy or click it in the scene to highlight it. Animated framing uses a sampled envelope (17 poses per clip); unusually fast or procedural motion may extend beyond that envelope. Reset view includes the current pose in its bounds.

## Regression checks

The included CC0 robot fixture exercises skinned animation and multiple clips. Start the demo, then run:

```sh
bunx playwright install --with-deps chromium
VIEWER_TEST_URL=http://localhost:5173 bun run test
```

The suite covers extreme model scales, framing, shared-resource statistics, the real animated fixture, pane isolation, both helpers, the orthographic toggle, fly fallback, playback and replacement, and phone layout. For an existing Docker Chrome, set `VIEWER_TEST_CDP=http://127.0.0.1:9223` and a `VIEWER_TEST_URL` reachable from that container.

## Notes

- The demo intentionally accepts GLB only because standalone `.gltf` files can reference sidecar buffers and textures. The component itself can load any URL supported by `GLTFLoader`.
- Draco and Meshopt are enabled by default. Pass a self-hosted Draco decoder path through `useDraco`, or configure KTX2 and other extensions with `extendLoader`.
- Blob URLs clear Drei's loader cache on unmount by default. Set `clearCacheOnUnmount` explicitly for other short-lived URLs.
- Screenshot support uses `preserveDrawingBuffer` when viewer UI is enabled. Set `showUi={false}` on dense grids to reduce GPU overhead.
- First-person pointer lock may be blocked inside restrictive iframes; the component automatically falls back to focused-canvas drag look when the browser exposes that policy.
