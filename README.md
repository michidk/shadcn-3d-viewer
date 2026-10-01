# Frame — shadcn 3D viewer

A source-owned shadcn component for viewing GLB models with React Three Fiber. It is adapted from Asset Studio's production model viewer and presented in a standalone Vite demo.

The UI uses shadcn's **Base UI / Nova** primitives (`@base-ui/react`) and the standard neutral theme. Buttons, menus, and tooltips use Base UI's `render` composition API, not Radix's `asChild`. Theme tokens live in `src/theme.css`; add `dark` to the document root for dark mode. The 3D scene's day/night lighting remains independent of the UI theme.

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

## Storybook

```sh
bun run storybook        # http://localhost:6006
bun run storybook:build  # static site in storybook-static/
bun run storybook:test   # smoke tests against a running Storybook
```

The 14 examples cover the interactive playground, fixed four-view layout, Drei cube, night lighting, the bundled animated robot, model inspection, minimal embeds, error handling, custom toolbars, custom button/tooltip implementations, styled overlays, and standalone inspector states. Viewer toolbar changes and Storybook Controls stay in sync. Docs pages render one live viewer at a time to stay within browser WebGL limits.

Storybook shares `src/theme.css` with the demo but does not load the demo page layout. All model assets are served locally from `public/`, including in the static build. The error story deliberately requests a missing model.

Use Storybook's **Theme** toolbar to preview every example in light or dark mode, including portaled menus and tooltips.

For browser tests, install Chromium with `bunx playwright install --with-deps chromium`, or reuse Docker Chrome through `VIEWER_TEST_CDP`. Set `STORYBOOK_TEST_URL` if Storybook is not at `http://localhost:6006`; the Docker browser must be able to reach that URL. Storybook tests are separate from the demo's `bun run test` suite.

## Add the component

This repository includes a shadcn registry manifest. Build the local registry, then install the component into another shadcn project:

```sh
bun run registry:build
bunx shadcn@latest add ./public/r/model-viewer.json
```

Use a Base UI shadcn project (this repository uses `"style": "base-nova"` in `components.json`). The registry item installs its React Three Fiber dependencies and the shadcn `alert`, `button`, `tooltip`, and `dropdown-menu` primitives. Radix versions of these controls are not interchangeable with the Base UI composition API.

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

Controls include accessible button labels and visual tooltips by default, following Base UI's tooltip guidance. Do not put essential instructions only in a tooltip. Replace either implementation without changing the viewer:

```tsx
<ModelViewer components={{ Button: AppButton, Tooltip: AppTooltip }} />
```

`Button` accepts the Base UI shadcn button props (including `variant`, `size`, and `render`) and must forward its ref, event handlers, ARIA attributes, and `className` to the actual button. `Tooltip` receives `{ content, children }`; use `<TooltipTrigger render={children} />` to preserve refs and handlers. Exported `ViewerUiComponents` and `ViewerTooltipProps` describe these contracts. Define overrides outside render to preserve component identity.

`ModelInspector` is separately exported with searchable/collapsible hierarchy, metric cards, dimensions, and selection state. Pass `inspection`, `selectedMesh`, `onSelectMesh`, optional `onClose`, `className`, and optional `components`. Use `ViewerUiProvider` to share overrides across composed controls. The inspector includes its stylesheet; override `className`/CSS for custom placement.

### Compose your own toolbar

The default viewer remains a one-component drop-in. For a smaller toolbar, pass your own composition and connect it to the controlled viewer props:

```tsx
import { useState } from "react";
import { Grid2X2 } from "lucide-react";
import {
  ModelViewer,
  ModelViewerToolbar,
  ModelViewerToolbarGroup,
  ModelViewerToolbarButton,
} from "@/components/ui/model-viewer";

export function AssetPreview() {
  const [grid, setGrid] = useState(false);

  return (
    <ModelViewer
      className="rounded-xl shadow-none"
      showGrid={grid}
      onGridChange={setGrid}
      toolbar={
        <ModelViewerToolbar aria-label="Preview controls">
          <ModelViewerToolbarGroup aria-label="Display">
            <ModelViewerToolbarButton
              label="Show grid"
              active={grid}
              onClick={() => setGrid(!grid)}
            >
              <Grid2X2 />
            </ModelViewerToolbarButton>
          </ModelViewerToolbarGroup>
        </ModelViewerToolbar>
      }
    />
  );
}
```

`toolbar={null}` hides only the main toolbar; `showUi={false}` hides all built-in controls. `ModelViewerControls` and `ModelViewerAnimationControls` export the ready-made controlled toolbars. Arrow Left/Right and Home/End move focus between toolbar buttons; Tab retains normal browser navigation.

DOM-facing components accept native props, React 19 refs, `className`, and `style`. `ModelViewer` forwards these to its root `div` (its `onLoad`/`onError` remain model lifecycle callbacks), and renders `children` as additional DOM overlays, not R3F scene children. Use positioned children with a z-index to place additional UI above the canvas.

Stable `data-slot` attributes include `model-viewer`, `model-viewer-toolbar`, `model-viewer-toolbar-group`, `model-viewer-toolbar-button`, `model-viewer-animation-controls`, `model-inspector`, and `model-inspector-node`. The root exposes `data-state="loading|ready|error"`; toggle buttons expose `data-state="on|off"`.

Styles live in Tailwind's `components` layer, so utility classes can override them. UI surfaces use shadcn semantic tokens; day/night lighting changes the 3D scene independently of the host application's theme. Default height is 620px; a height utility can override it unless an explicit `height` or inline `style.height` is supplied.

`ViewerControlButton` is also exported. Its optional `tooltip` prop accepts custom content or `false` to hide it. Controls default to `type="button"`, so placing a viewer inside a form does not submit it. A shared tooltip provider coordinates hover delays; standalone controls provide their own fallback.

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
