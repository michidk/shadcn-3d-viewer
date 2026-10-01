import type { Meta, StoryObj } from "@storybook/react-vite";
import { Grid2X2, ScanSearch } from "lucide-react";
import {
  ModelViewer,
  ModelViewerRoot,
  ModelViewerScene,
  ModelViewerDefaultToolbar,
  ModelViewerAnimationBar,
  ModelViewerInspector,
  ModelViewerStatus,
  ModelViewerFullscreen,
  useModelViewer,
  ModelViewerToolbar,
  ModelViewerToolbarButton,
  ModelViewerToolbarGroup,
  type ViewerUiComponents,
} from "@/components/ui/model-viewer";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function CompactToolbar() {
  const { showGrid, setShowGrid, projection, setProjection } = useModelViewer();
  return (
    <ModelViewerToolbar aria-label="Custom display controls">
      <ModelViewerToolbarGroup aria-label="Display">
        <ModelViewerToolbarButton
          label="Show grid"
          active={showGrid}
          onClick={() => setShowGrid(!showGrid)}
        >
          <Grid2X2 />
        </ModelViewerToolbarButton>
        <ModelViewerToolbarButton
          label="Orthographic view"
          active={projection === "orthographic"}
          onClick={() =>
            setProjection(
              projection === "orthographic" ? "perspective" : "orthographic",
            )
          }
        >
          <ScanSearch />
        </ModelViewerToolbarButton>
      </ModelViewerToolbarGroup>
    </ModelViewerToolbar>
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
          "Compose viewer parts and access the nearest root with useModelViewer. Local shadcn primitives and Base UI render are the primary customization path; component overrides remain a compatibility escape hatch.",
      },
    },
  },
} satisfies Meta<typeof ModelViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CustomToolbar: Story = {
  render: (args) => <ModelViewer {...args} toolbar={<CompactToolbar />} />,
};

export const CompoundViewer: Story = {
  render: ({ height }) => (
    <ModelViewerRoot
      height={height}
      src="/models/robot-expressive.glb"
      defaultAnimation="Walking"
    >
      <ModelViewerScene />
      <ModelViewerDefaultToolbar />
      <ModelViewerAnimationBar />
      <ModelViewerInspector />
      <ModelViewerStatus />
      <ModelViewerFullscreen />
    </ModelViewerRoot>
  ),
};

function RenderToolbar() {
  const viewer = useModelViewer();
  return (
    <ModelViewerToolbar aria-label="Render composition controls">
      <ModelViewerToolbarGroup>
        <ModelViewerToolbarButton
          label="Show grid"
          size="default"
          active={viewer.showGrid}
          onClick={() => viewer.setShowGrid(!viewer.showGrid)}
          render={<button data-custom-render="grid" className="rounded-full" />}
        >
          <Grid2X2 /> Grid
        </ModelViewerToolbarButton>
      </ModelViewerToolbarGroup>
    </ModelViewerToolbar>
  );
}

export const RenderComposition: Story = {
  render: ({ height }) => (
    <ModelViewerRoot height={height}>
      <ModelViewerScene />
      <RenderToolbar />
      <ModelViewerStatus />
    </ModelViewerRoot>
  ),
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
