# shadcn-3d-viewer

A source-owned shadcn component for viewing GLB models with React Three Fiber. It is adapted from Asset Studio's production model viewer and presented in a standalone Vite demo.

## Install

After the npm release, run this in a Base UI shadcn project:

```sh
npx shadcn-3d-viewer add
```

The npm package is a small installer for the included shadcn registry item. It runs `shadcn add` and copies the component source into your project; it is **not** a compiled library to import from `shadcn-3d-viewer`. Review changes before accepting prompts. Pass shadcn options through, for example `npx shadcn-3d-viewer add --dry-run`. The component's own dependencies are installed into your app by shadcn. Use `@/components/ui/model-viewer` in your app after installation.

The demo uses shadcn's **Base UI / Nova** primitives (`@base-ui/react`) and the standard neutral theme. The installed viewer uses your project's local primitives and existing theme; Nova and neutral are not requirements. Buttons, menus, and tooltips use Base UI's `render` composition API, not Radix's `asChild`. Theme tokens live in `src/theme.css`; add `dark` to the document root for dark mode. The 3D scene's day/night lighting remains independent of the UI theme.

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

The 23 examples cover the interactive playground, fixed four-view layout, Drei cube, night lighting, the bundled animated robot, model inspection, minimal embeds, loading/error customization, opt-in filenames, hidden feedback, retry and custom recovery, offscreen playback, on-demand loading, custom toolbars, compound viewer parts, Base UI `render` composition, compatibility button/tooltip overrides, styled overlays, and standalone inspector states. Viewer toolbar changes and Storybook Controls stay in sync. Docs pages render one live viewer at a time to stay within browser WebGL limits.

Storybook shares `src/theme.css` with the demo but does not load the demo page layout. All model assets are served locally from `public/`, including in the static build. The error story deliberately requests a missing model.

Use Storybook's **Theme** toolbar to preview every example in light or dark mode, including portaled menus and tooltips.

For browser tests, install Chromium with `bunx playwright install --with-deps chromium`, or reuse Docker Chrome through `VIEWER_TEST_CDP`. Set `STORYBOOK_TEST_URL` if Storybook is not at `http://localhost:6006`; the Docker browser must be able to reach that URL. Storybook tests are separate from the demo's `bun run test` suite.

## Add the component

To install from a local checkout before the npm release, build the shadcn registry item, then add it from another shadcn project:

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

## Publishing

This package is MIT licensed and publishes the CLI plus generated registry JSON, not the demo, Storybook, test fixtures, or model assets. Maintainers need Bun and Node 20 or newer. `prepack` rebuilds the registry and runs typecheck, lint, production build, and package tests.

```sh
bun install --frozen-lockfile
npm pack --dry-run
npm publish --dry-run
# After reviewing the tarball and configuring npm publishing access:
npm publish --access public
```

The npm name must still be claimed by the first successful publish. Publishing is not performed by the repository build or CI. The GitHub repository and npm package are separate: pushing code does not publish a new package version.

## Usage

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

Omit `src` to render the built-in material study. Use `showUi={false}` for a clean embedded preview.

### Accessibility

Give each meaningful viewer a specific accessible name. `aria-label` names the viewer group directly; use `aria-labelledby` when a visible heading already names it. Link a nearby text description with `aria-describedby` when the model's shape, appearance, or other details matter. The canvas is interactive, so a label alone is not a substitute for describing essential visual information in text.

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

The older `alt` prop still works as a fallback accessible name and screenshot filename, but new code should use `aria-label` or `aria-labelledby`. Native ARIA attributes are forwarded to the root viewer element. The orientation menu and toolbar are keyboard-operable; the 3D canvas is not a complete keyboard or screen-reader equivalent for inspecting every mesh, so provide essential model details outside it.

### Load the renderer on demand

```tsx
import { ModelViewer } from "@/components/ui/model-viewer/lazy";

// No renderer chunk is requested until this component is mounted.
{open && <ModelViewer src="/models/chair.glb" height={420} />}
```

The dedicated `lazy` entry imports only React, styling, and the loading icon synchronously. It reserves the viewer's space and accepts `importFallback` (a React node, or `null`) while downloading the renderer. That placeholder runs before a viewer context exists; `loadingFallback` continues to handle model loading inside the root. The eager barrel remains available for compound composition; importing it elsewhere on the same page can load the renderer eagerly. JavaScript chunk-download failures propagate to your app's error boundary; model retry does not retry failed application chunks. The demo uses the lazy entry too.

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

Loading filenames are hidden unless `showFileName` is enabled. This affects built-in loading UI only, not network requests or custom renderers. Custom loading renderers receive `{ active, progress, item, loaded, total }`; `item` is this viewer's `src`, while the numeric fields remain zero because loading is indeterminate and isolated from other viewers. The default error card omits raw technical details; use `onError` for logging or `errorFallback` to render them yourself. Pass `null` (or return `null`) to hide either overlay.

`showRetry` adds a button to the default error card. `useModelViewer().retry()` provides the same action for custom fallback components: it clears Drei's cache for the failed URL and remounts the renderer, resetting load/inspection state. Retry is manual and only acts on a failed model with a `src`; it does not fix invalid files or renew signed URLs. Replace `src` in the host app for those cases. `onError` reports every failed attempt and `onLoad` reports successful recovery.

With `pauseWhenHidden`, leaving the viewport or hiding the browser tab stops the frame loop and pauses animation/auto-rotation without unmounting the model. Returning resumes from the existing pose and preserves the requested play/pause state (including controlled props); this does not emit playback-change callbacks. Network/model loading is not cancelled. Disable this option for intentional background rendering. `useModelViewer().renderingPaused` and `data-rendering="paused|active"` expose the effective suspension state. Browsers without IntersectionObserver still suspend for hidden tabs.

```tsx
<ModelViewer
  src="/models/chair.glb"
  loadingFallback={<MySpinner />}
  errorFallback={() => <p role="alert">Preview unavailable.</p>}
/>
```

`mode`, `lighting`, `shading`, `showGrid`, `showFloor`, `viewCube`, `projection`, `autoRotate`, camera, and animation props are controlled when supplied. Use their corresponding `default*` props for uncontrolled initial values. Change callbacks report toolbar interactions. In particular, use `onViewCubeChange`, `onProjectionChange`, `onFloorChange`, and `onAutoRotateChange` when controlling these options externally. Auto-rotation orbits the camera around the model in orbit mode; its toolbar toggle is disabled in split and fly modes, and the rotation preference resumes when returning to orbit mode.

`showFloor` adds a large ground plane and shadow receiver without changing the model's GLB. Its default color matches the studio background or the Outside horizon tone; `floorColor` overrides it. Outside uses a procedural atmospheric sky and sun lighting without fetching a remote HDRI. Realistic shading preserves source materials and textures; Solid replaces them with a muted matte gray, including the sample objects.

To start an animated model rotating and playing a particular clip:

```tsx
<ModelViewer
  src="/models/robot-expressive.glb"
  defaultAutoRotate
  defaultAnimation="Walking"
  defaultAnimationPlaying
/>
```

The toolbar offers one orthographic toggle; direction changes are available through the orientation helper. `cameraPreset` remains available for programmatic positioning. Helpers appear in orbit mode. Set `viewCube={false}` to hide one, or explicitly set `showOrientation` to show it in a UI-free viewer.

`ViewCube` is also an exported, source-owned shadcn-style component. Compose it inside your own React Three Fiber `Canvas` with default camera controls, or configure it through `ModelViewer`:

```tsx
<ModelViewer defaultViewCube="drei" viewCubePosition="top-right" viewCubeMargin={[64, 80]} />

// Inside an R3F Canvas:
<ViewCube variant="asset-studio" position="top-right" margin={[64, 64]} />
```

Standalone `ViewCube` defaults to render priority 1. When composing with a custom renderer, use a later priority (the viewer uses 2). The four split panes keep fixed directions; dragging pans and scrolling zooms without rotating them.

To replace the built-in cube with your own R3F gizmo, disable it and pass scene nodes through `sceneContent` (or the same prop on `ModelViewerScene` in a compound viewer):

```tsx
<ModelViewer
  src="/models/chair.glb"
  viewCube={false}
  sceneContent={<MyR3FViewCube />}
/>
```

`sceneContent` renders inside the primary orbit pane, after its default camera controls. It is not rendered in fixed split or first-person mode. Ordinary `children` and `overlay` remain DOM content. A custom scene cube should also provide keyboard-accessible DOM controls; the built-in orientation menu is hidden when `viewCube={false}`.

For arbitrary camera positions, `useModelViewer()` exposes `getCameraView()` and `setCameraView({ position, target }, { transition?: boolean })`. The setter returns `false` until orbit controls are mounted (or for non-finite/zero-distance views). `transition` defaults to `true`. `useModelViewerCamera()` subscribes to the live primary orbit camera view, returning `null` before controls mount; unlike `onCameraChange`, which fires when movement settles, it updates as the user drags. Camera values use world-space Three.js coordinates. This subscription does not rerender the viewer root on each frame.

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

Both built-in viewer cube variants have a DOM keyboard counterpart: Tab to **Orient view**, then use Enter/Space to open its direction menu, arrow keys/Home/End to navigate, Enter to select, and Escape to close. The trigger reveals itself on focus and stays visible while open. It is available whenever the cube is enabled in orbit mode, including `showUi={false}` with explicit `showOrientation`; it is absent in fixed split and fly modes. `ModelViewerScene` includes `ModelViewerOrientationControls` automatically. The exported part supports `className`/`style`; the standalone R3F `ViewCube` remains canvas-only and needs equivalent host DOM controls for keyboard access. Direction entries are actions, not radio selections, because orbiting can change the camera afterwards.

### Compatibility component overrides

Prefer editing your local shadcn primitives, composing the exported parts, and using Base UI's `render` prop. The optional `components` API remains available for existing consumers and application-wide overrides; it is not required to match your theme.

Controls include accessible button labels and visual tooltips by default, following Base UI's tooltip guidance. Do not put essential instructions only in a tooltip. Replace either implementation without changing the viewer:

```tsx
<ModelViewer components={{ Button: AppButton, Tooltip: AppTooltip }} />
```

`Button` accepts the Base UI shadcn button props (including `variant`, `size`, and `render`) and must forward its ref, event handlers, ARIA attributes, and `className` to the actual button. `Tooltip` receives `{ content, children }`; use `<TooltipTrigger render={children} />` to preserve refs and handlers. Exported `ViewerUiComponents` and `ViewerTooltipProps` describe these contracts. Define overrides outside render to preserve component identity.

`ModelInspector` is separately exported with searchable/collapsible hierarchy, metric cards, dimensions, and selection state. Pass `inspection`, `selectedMesh`, `onSelectMesh`, optional `onClose`, `className`, and optional `components`. Use `ViewerUiProvider` to share overrides across composed controls. The inspector includes its stylesheet; override `className`/CSS for custom placement.

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

The root owns state and the containing DOM element. It renders **no Canvas or controls automatically**. Mount exactly one `ModelViewerScene` inside each root; mount or omit the other parts as needed. The scene owns model loading, error/loading fallbacks, and the renderer. `ModelViewerAnimationBar` appears only when clips are available; `ModelViewerInspector` appears when opened and inspection data is ready.

`ModelViewerRoot` takes the viewer's scene and controlled/default state props, native DOM props, and refs. The preset-only props `toolbar`, `overlay`, and `showAnimationControls` are replaced by children in a compound composition. `showUi` on the root controls pane labels and the default orientation/capture configuration; it does not hide explicitly mounted children.

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

`render` changes the rendered element while preserving Base UI's refs, handlers, and accessibility attributes. Custom React components supplied to `render` must forward those props to their DOM element. Use `className`, `variant`, and `size` for styling without replacing an element.

The hook exposes mode, lighting, shading, grid, projection, cube, camera preset, animation, inspector, and selection state with corresponding setters; `resetView`, `getCameraView`, `setCameraView`, `restartAnimation`, `capture`, and `toggleFullscreen`; plus `status`, `canCapture`, `feedback`, and `reducedMotion`. `useModelViewerCamera` provides a separate live camera subscription. `status` is `idle` without a scene, otherwise `loading | ready | error`. Each root is independent. Using either hook or connected parts outside a root throws a descriptive error.

Controlled props stay controlled: a hook action reports the change callback, but the UI changes only when the owner supplies the new value. Use `inspectorOpen` / `onInspectorOpenChange` or `defaultInspectorOpen` for new code; legacy `showInspector` remains supported.

Toolbar layout measures mounted top toolbars, including wraps and custom button sizes, to reserve room in split views. Use `placement="static"` for a toolbar that should not reserve top space. Primitive button sizing and menu styling are not overridden by viewer CSS.

Fullscreen defaults to the top-right; animation controls default to the bottom-right. On narrow viewers, the interaction hint sits above the animation panel. Reposition the compound parts with `className` or `style` (for example, `className="top-auto bottom-3"` on `ModelViewerFullscreen`). The default top-right view cube leaves space below fullscreen; explicit `viewCubeMargin` values take precedence.

`toolbar={null}` hides only the main toolbar; `showUi={false}` hides all built-in controls. `ModelViewerControls` and `ModelViewerAnimationControls` export the ready-made controlled toolbars. Arrow Left/Right and Home/End move focus between toolbar buttons; Tab retains normal browser navigation.

DOM-facing components accept native props, React 19 refs, `className`, and `style`. `ModelViewer` forwards these to its root `div` (its `onLoad`/`onError` remain model lifecycle callbacks), and renders `children` as additional DOM overlays, not R3F scene children. Use positioned children with a z-index to place additional UI above the canvas.

Additional compound slots are `model-viewer-scene`, `model-viewer-status`, `model-viewer-fullscreen`, and `model-viewer-overlay`. Shading, view-cube, and animation selections use semantic menu radio groups with `aria-checked`.

Stable `data-slot` attributes include `model-viewer`, `model-viewer-toolbar`, `model-viewer-toolbar-group`, `model-viewer-toolbar-button`, `model-viewer-animation-controls`, `model-inspector`, and `model-inspector-node`. The root exposes `data-state="idle|loading|ready|error"`; toggle buttons expose `data-state="on|off"`.

Styles live in Tailwind's `components` layer, so utility classes can override them. UI surfaces use shadcn semantic tokens; day/night lighting changes the 3D scene independently of the host application's theme. The grid uses neutral grays in both lighting modes. Width fills the parent by default; constrain it with a parent such as `<div className="mx-auto max-w-5xl">` when a full-width workspace is not wanted. Default height is 620px; a height utility can override it unless an explicit `height` or inline `style.height` is supplied.

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
