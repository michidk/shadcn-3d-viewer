import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/stories/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs"],
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
};

export default config;
