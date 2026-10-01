import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Grid2X2, ScanSearch } from "lucide-react";
import {
  ModelViewer,
  ModelViewerToolbar,
  ModelViewerToolbarButton,
  ModelViewerToolbarGroup,
  type ModelViewerProps,
  type ViewerUiComponents,
} from "@/components/ui/model-viewer";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function CustomToolbarExample(args: ModelViewerProps) {
  const [grid, setGrid] = useState(false);
  const [projection, setProjection] = useState<"perspective" | "orthographic">(
    "perspective",
  );
  return (
    <ModelViewer
      {...args}
      showGrid={grid}
      projection={projection}
      onGridChange={setGrid}
      onProjectionChange={setProjection}
      toolbar={
        <ModelViewerToolbar aria-label="Custom display controls">
          <ModelViewerToolbarGroup aria-label="Display">
            <ModelViewerToolbarButton
              label="Show grid"
              active={grid}
              onClick={() => setGrid(!grid)}
            >
              <Grid2X2 />
            </ModelViewerToolbarButton>
            <ModelViewerToolbarButton
              label="Orthographic view"
              active={projection === "orthographic"}
              onClick={() =>
                setProjection(
                  projection === "orthographic"
                    ? "perspective"
                    : "orthographic",
                )
              }
            >
              <ScanSearch />
            </ModelViewerToolbarButton>
          </ModelViewerToolbarGroup>
        </ModelViewerToolbar>
      }
    />
  );
}

// Keep component identities stable and forward all native props, including ref.
const customComponents: ViewerUiComponents = {
  Button: function AppButton({ className, ...props }) {
    return <Button {...props} className={`rounded-full ${className ?? ""}`} />;
  },
  Tooltip: function AppTooltip({ children, content }) {
    return (
      <Tooltip>
        <TooltipTrigger render={children} />
        <TooltipContent
          side="bottom"
          className="border border-primary bg-primary text-primary-foreground"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    );
  },
};

const meta = {
  title: "Composition/Custom Controls",
  component: ModelViewer,
  tags: ["autodocs"],
  args: { height: 500 },
  parameters: {
    controls: { include: ["height"] },
    docs: {
      description: {
        component:
          "Compose a small toolbar with controlled viewer props, or replace the button and tooltip implementations without forking the scene renderer.",
      },
    },
  },
} satisfies Meta<typeof ModelViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CustomToolbar: Story = {
  render: (args) => <CustomToolbarExample {...args} />,
};

export const CustomButtonAndTooltip: Story = {
  args: { components: customComponents },
};

export const StyledEmbed: Story = {
  args: {
    className: "rounded-none border-2 border-primary shadow-none",
    showUi: false,
  },
  render: (args) => (
    <ModelViewer {...args}>
      <span className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-md bg-background px-3 py-2 text-xs text-foreground">
        Your application overlay
      </span>
    </ModelViewer>
  ),
};
