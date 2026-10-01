import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import {
  ModelInspector,
  type ModelInspectorProps,
} from "@/components/ui/model-viewer";

const meta = {
  title: "Inspector/Model Inspector",
  component: ModelInspector,
  tags: ["autodocs"],
  args: {
    className: "relative top-auto left-auto max-h-[600px]",
    selectedMesh: null,
    onSelectMesh: fn(),
    inspection: {
      triangles: 12480,
      materials: 3,
      textures: 2,
      dimensions: [2.4, 1.8, 1.2],
      nodes: [
        { id: "0", name: "Lounge chair", type: "Group", depth: 0, mesh: false },
        { id: "0/0", name: "Walnut frame", type: "Mesh", depth: 1, mesh: true },
        { id: "0/1", name: "Upholstery", type: "Group", depth: 1, mesh: false },
        {
          id: "0/1/0",
          name: "Seat cushion",
          type: "Mesh",
          depth: 2,
          mesh: true,
        },
        {
          id: "0/1/1",
          name: "Back cushion",
          type: "Mesh",
          depth: 2,
          mesh: true,
        },
      ],
    },
  },
  parameters: {
    controls: { include: ["selectedMesh", "inspection"] },
    docs: {
      description: {
        component:
          "A standalone inspector: no Canvas or model loader required. Supply your own inspection data and selection handler.",
      },
    },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<ModelInspectorProps>();
    return (
      <ModelInspector
        {...args}
        onSelectMesh={(selectedMesh) => {
          args.onSelectMesh(selectedMesh);
          updateArgs({ selectedMesh });
        }}
      />
    );
  },
} satisfies Meta<typeof ModelInspector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hierarchy: Story = {};
export const SelectedMesh: Story = { args: { selectedMesh: "0/1/0" } };
export const Empty: Story = {
  args: {
    inspection: {
      triangles: 0,
      materials: 0,
      textures: 0,
      dimensions: [0, 0, 0],
      nodes: [],
    },
  },
};
