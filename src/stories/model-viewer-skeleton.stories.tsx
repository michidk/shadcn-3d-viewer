import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModelViewer, ModelViewerSkeleton } from "@/components/ui/model-viewer/lazy";

const meta = {
  title: "Viewer/Skeleton",
  component: ModelViewerSkeleton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A viewer-shaped placeholder with no Three.js imports. It fills its nearest positioned ancestor, so it works as `loadingFallback` or inside any `.model-viewer` frame.",
      },
    },
  },
  args: { showToolbar: true, showViewCube: true },
  render: (args) => (
    <div className="model-viewer" style={{ height: 420 }}>
      <ModelViewerSkeleton {...args} />
    </div>
  ),
} satisfies Meta<typeof ModelViewerSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutChrome: Story = {
  args: { showToolbar: false, showViewCube: false },
  parameters: {
    docs: { description: { story: "Match a minimal embed that hides the toolbar and view cube." } },
  },
};

export const LazyViewerFallback: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "With the lazy entry, `loadingFallback` covers both the renderer chunk download and model loading. Throttle the network to see it before the robot appears.",
      },
    },
  },
  render: function Example() {
    const [open, setOpen] = useState(false);
    return (
      <div className="space-y-4">
        <Button onClick={() => setOpen(!open)}>{open ? "Close viewer" : "Open viewer"}</Button>
        {open && (
          <ModelViewer
            src="/models/robot-expressive.glb"
            aria-label="Robot with skeleton loading"
            height={420}
            loadingFallback={<ModelViewerSkeleton />}
          />
        )}
      </div>
    );
  },
};
