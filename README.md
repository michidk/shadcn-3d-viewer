# Frame — shadcn 3D viewer

A source-owned shadcn component for viewing GLB models with React Three Fiber. It is adapted from Asset Studio's production model viewer and presented in a standalone Vite demo.

## Features

- Smooth camera controls, presets, bounded zoom, and an axis helper
- Four independently orbitable front/right/back/left views sharing one WebGL renderer
- First-person fly camera with pointer-lock and drag-look fallback
- Realistic, solid, normal, and wireframe shading
- Procedural image-based studio lighting, day/night modes, and an optional fading grid
- GLTF animation clip selection, playback, restart, looping, and speed controls
- Clipboard and downloadable PNG captures
- Fullscreen with an in-page fallback
- Loading progress, posters, custom fallbacks, and error states
- Adaptive pixel ratio, reduced-motion support, and demand-driven rendering
- Draco, Meshopt, and custom loader configuration
- Optional UI-free mode for cards and compact previews

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

The registry item installs its React Three Fiber dependencies and the shadcn `alert`, `button`, and `dropdown-menu` primitives.

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
| `autoRotate` | `boolean` | `false` |
| `cameraPreset` | `isometric \| front \| right \| back \| left \| top \| bottom` | `isometric` |
| `animation` | clip name or `null` | first available clip |
| `animationPlaying` | `boolean` | `false` |
| `animationSpeed` | `number` | `1` |
| `environment` | `boolean` | `true` |
| `poster` | image URL | none |
| `loadingFallback` | node or progress renderer | built-in progress |
| `errorFallback` | node or error renderer | built-in alert |

`mode`, `lighting`, `shading`, `showGrid`, camera, and animation props are controlled when supplied. Use their corresponding `default*` props for uncontrolled initial values. Change callbacks report toolbar interactions.

## Notes

- The demo intentionally accepts GLB only because standalone `.gltf` files can reference sidecar buffers and textures. The component itself can load any URL supported by `GLTFLoader`.
- Draco and Meshopt are enabled by default. Pass a self-hosted Draco decoder path through `useDraco`, or configure KTX2 and other extensions with `extendLoader`.
- Blob URLs clear Drei's loader cache on unmount by default. Set `clearCacheOnUnmount` explicitly for other short-lived URLs.
- Screenshot support uses `preserveDrawingBuffer` when viewer UI is enabled. Set `showUi={false}` on dense grids to reduce GPU overhead.
- First-person pointer lock may be blocked inside restrictive iframes; the component automatically falls back to focused-canvas drag look when the browser exposes that policy.
