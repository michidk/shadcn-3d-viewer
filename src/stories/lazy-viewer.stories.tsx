import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModelViewer } from "@/components/ui/model-viewer/lazy";

const meta = {
  title: "Viewer/Lazy Loading",
  component: ModelViewer,
  parameters: {
    docs: {
      description: {
        component:
          "The same Model Viewer, imported from `model-viewer/lazy`. Three.js and the renderer download only when the viewer mounts—press the button to load it.",
      },
    },
  },
  render: function Example(args) {
    const [open, setOpen] = useState(false);
    return (
      <div className="space-y-4">
        <Button onClick={() => setOpen(!open)}>{open ? "Close viewer" : "Open viewer"}</Button>
        {open && <ModelViewer {...args} />}
      </div>
    );
  },
} satisfies Meta<typeof ModelViewer>;

export default meta;
type Story = StoryObj<typeof meta>;
export const OnDemand: Story = { args: { height: 420 } };
