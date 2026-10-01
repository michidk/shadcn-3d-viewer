# Frame — shadcn 3D viewer

A source-owned shadcn component for viewing GLB/glTF models with React Three Fiber. It is adapted from Asset Studio's production model viewer and presented in a standalone Vite demo.

## Features

- Orbit camera with bounded zoom and an axis helper
- Four independently orbitable front/right/back/left views
- First-person fly camera with pointer-lock and drag-look fallback
- Realistic, solid, normal, and wireframe shading
- Day/night lighting, ground plane, and grid toggles
- Clipboard and downloadable PNG captures
- Fullscreen with an in-page fallback
- Loading and error states
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
bun add @react-three/fiber @react-three/drei three lucide-react
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
      showGround
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
| `showGround` | `boolean` | `true` |
| `showGrid` | `boolean` | `false` |
| `showUi` | `boolean` | `true` |
| `showOrientation` | `boolean` | follows `showUi` |
| `autoRotate` | `boolean` | `false` |

The mode, lighting, and shading props set initial values. Their callbacks report toolbar changes so a parent can synchronize external state.

## Notes

- GLB is the best format for browser uploads because all buffers and textures live in one file. A `.gltf` file can reference sidecar assets that an object URL cannot resolve.
- Screenshot support uses `preserveDrawingBuffer` when viewer UI is enabled. Set `showUi={false}` on dense grids to reduce GPU overhead.
- First-person pointer lock may be blocked inside restrictive iframes; the component automatically falls back to focused-canvas drag look when the browser exposes that policy.

