import type { Preview } from "@storybook/react-vite";
import {
  Controls,
  Description,
  Primary,
  Title,
} from "@storybook/addon-docs/blocks";
import "../src/theme.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    controls: { expanded: true },
    options: { storySort: { order: ["Viewer", "Composition", "Inspector"] } },
    docs: {
      // Keep docs to one live Canvas. Rendering every example at once can
      // exhaust a browser's WebGL context limit.
      page: () => (
        <>
          <Title />
          <Description />
          <Primary />
          <Controls />
        </>
      ),
    },
  },
};

export default preview;
