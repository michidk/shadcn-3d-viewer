import type { Preview } from "@storybook/react-vite";
import { useEffect } from "react";
import {
  Controls,
  Description,
  Primary,
  Title,
} from "@storybook/addon-docs/blocks";
import "../src/theme.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "shadcn UI theme (independent of scene lighting)",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    function Theme(Story, context) {
      const dark = context.globals.theme === "dark";
      useEffect(() => {
        // Apply to the document so portaled Base UI menus and tooltips inherit it.
        document.documentElement.classList.toggle("dark", dark);
        return () => document.documentElement.classList.remove("dark");
      }, [dark]);
      return <Story />;
    },
  ],
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
