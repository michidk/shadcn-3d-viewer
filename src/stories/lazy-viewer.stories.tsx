import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";
import { ModelViewer } from "@/components/ui/model-viewer/lazy";

const meta = {
  title: "Viewer/Lazy Viewer",
  component: ModelViewer,
  render: function Example(args) {
    const [open, setOpen] = useState(false);
    return <div className="space-y-4">
      <Button onClick={() => setOpen(!open)}>{open ? "Close viewer" : "Open viewer"}</Button>
      {open && <ModelViewer {...args} />}
    </div>;
  },
} satisfies Meta<typeof ModelViewer>;

export default meta;
type Story = StoryObj<typeof meta>;
export const OnDemand: Story = { args: { height: 420 } };
