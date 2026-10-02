import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import {
  ModelViewer,
  type ModelViewerProps,
} from "@/components/ui/model-viewer";

const meta = {
  title: "Viewer/Model Viewer",
  component: ModelViewer,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A source-owned React Three Fiber viewer. Change the controls below or use the toolbar; both stay in sync. The sample and animated robot are local assets—no model CDN is required.",
      },
    },
    controls: {
      include: [
        "src",
        "height",
        "mode",
        "lighting",
        "shading",
        "projection",
        "showGrid",
        "showFloor",
        "floorColor",
        "viewCube",
        "viewCubePosition",
        "inspectorPosition",
        "showUi",
        "showFileName",
        "showRetry",
        "pauseWhenHidden",
        "autoRotate",
        "defaultAutoRotate",
        "defaultAnimation",
        "defaultAnimationPlaying",
      ],
    },
  },
  argTypes: {
    mode: { control: "select", options: ["orbit", "split", "firstPerson"] },
    lighting: { control: "inline-radio", options: ["day", "night", "outside"] },
    shading: {
      control: "select",
      options: ["realistic", "solid", "normals", "wireframe"],
    },
    projection: {
      control: "inline-radio",
      options: ["perspective", "orthographic"],
    },
    viewCube: { control: "select", options: ["drei", "asset-studio", false] },
    viewCubePosition: {
      control: "select",
      options: ["top-right", "top-left", "bottom-right", "bottom-left"],
    },
    inspectorPosition: {
      control: "inline-radio",
      options: ["left", "right"],
    },
    height: { control: { type: "range", min: 320, max: 800, step: 20 } },
    pauseWhenHidden: { control: "boolean" },
  },
  args: {
    height: 520,
    mode: "orbit",
    lighting: "day",
    shading: "realistic",
    projection: "perspective",
    viewCube: "asset-studio",
    showGrid: false,
    showUi: true,
    pauseWhenHidden: true,
    onLoad: fn(),
    onError: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<ModelViewerProps>();
    return (
      <ModelViewer
        {...args}
        onModeChange={(mode) => updateArgs({ mode })}
        onLightingChange={(lighting) => updateArgs({ lighting })}
        onShadingChange={(shading) => updateArgs({ shading })}
        onProjectionChange={(projection) => updateArgs({ projection })}
        onViewCubeChange={(viewCube) => updateArgs({ viewCube })}
        onGridChange={(showGrid) => updateArgs({ showGrid })}
        onFloorChange={(showFloor) => updateArgs({ showFloor })}
        onAutoRotateChange={(autoRotate) => updateArgs({ autoRotate })}
        onAnimationChange={(animation) => updateArgs({ animation })}
        onAnimationPlayingChange={(animationPlaying) =>
          updateArgs({ animationPlaying })
        }
        onAnimationSpeedChange={(animationSpeed) =>
          updateArgs({ animationSpeed })
        }
      />
    );
  },
} satisfies Meta<typeof ModelViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const FourFixedViews: Story = {
  args: { mode: "split", projection: "orthographic", showGrid: true },
  parameters: {
    docs: {
      description: {
        story:
          "Fixed front/right/back/left directions with independent pan and zoom. Dragging never rotates these panes.",
      },
    },
  },
};

export const DreiViewCube: Story = {
  args: { viewCube: "drei", showGrid: true },
};

export const NightStudio: Story = {
  args: { lighting: "night", showGrid: true },
};

export const AnimatedModel: Story = {
  args: {
    src: "/models/robot-expressive.glb",
    "aria-label": "Animated robot",
    animation: "Walking",
    animationPlaying: false,
    showGrid: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "The local CC0 robot includes multiple animation clips. Playback starts paused and respects reduced-motion preferences.",
      },
    },
  },
};

export const RotatingAnimatedModel: Story = {
  args: {
    src: "/models/robot-expressive.glb",
    "aria-label": "Auto-rotating animated robot",
    defaultAutoRotate: true,
    defaultAnimation: "Walking",
    defaultAnimationPlaying: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Starts orbiting the camera and playing the Walking clip. The toolbar can pause rotation or animation independently; reduced-motion preferences still suppress both movements.",
      },
    },
  },
};

export const OutsideWithFloor: Story = {
  args: {
    src: "/models/robot-expressive.glb",
    "aria-label": "Robot outdoors with a ground shadow",
    lighting: "outside",
    defaultShowFloor: true,
    showGrid: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Procedural atmospheric sky, sun lighting, and a ground plane matched to the horizon color. The model casts a soft shadow; set floorColor to override the ground color.",
      },
    },
  },
};

export const ModelInspection: Story = {
  args: { showInspector: true },
  parameters: {
    docs: {
      description: {
        story:
          "Search the hierarchy, select a mesh, and inspect dimensions and resource counts.",
      },
    },
  },
};

export const MinimalEmbed: Story = {
  args: { height: 320, showUi: false, viewCube: false },
};

export const CustomFeedback: Story = {
  parameters: {
    docs: { description: { story: "Custom loading and error renderers. Throttle the network to inspect loading; set src to a missing model to inspect the custom error." } },
  },
  args: {
    src: "/models/robot-expressive.glb",
    loadingFallback: () => <span className="text-sm text-muted-foreground">Preparing your preview…</span>,
    errorFallback: () => <p role="alert" className="text-sm text-muted-foreground">Preview unavailable. Choose another model.</p>,
  },
};

export const LoadingFileName: Story = {
  args: { src: "/models/robot-expressive.glb", showFileName: true },
  parameters: {
    docs: { description: { story: "Opt in to the current asset filename. Throttle the network to inspect loading; filenames are hidden by default." } },
  },
};

export const HiddenFeedback: Story = {
  args: {
    src: "/models/intentional-missing-model.glb",
    loadingFallback: null,
    errorFallback: null,
  },
};

export const ErrorState: Story = {
  args: { src: "/models/intentional-missing-model.glb", onError: fn() },
  parameters: {
    docs: {
      description: {
        story:
          "An intentionally missing local model demonstrates the error boundary and disabled capture controls.",
      },
    },
  },
};

export const RetryError: Story = {
  args: { src: "/models/retry-example.glb", showRetry: true },
  parameters: {
    docs: { description: { story: "Retry clears the loader cache and requests the same URL again. A permanently missing file will still fail; the host must replace invalid or expired URLs." } },
  },
};

export const OffscreenPlayback: Story = {
  args: {
    src: "/models/robot-expressive.glb",
    animation: "Walking",
    animationPlaying: true,
    respectReducedMotion: false,
  },
  decorators: [(Story) => <><Story /><div style={{ height: "120vh" }}><p className="p-4 text-sm text-muted-foreground">Scroll the viewer completely out of view, then return. Playback resumes without changing the play/pause setting.</p></div></>],
};
