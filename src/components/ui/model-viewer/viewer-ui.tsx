"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ComponentProps,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import { Button as ShadcnButton } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ViewerTooltipProps = { children: ReactElement; content: ReactNode };
export type ViewerUiComponents = {
  /** Forward the ref, event handlers, aria attributes, and className to the underlying button. */
  Button: ComponentType<ComponentProps<typeof ShadcnButton>>;
  /** Render children as the trigger, preserving its ref and event handlers. */
  Tooltip: ComponentType<ViewerTooltipProps>;
};

function DefaultTooltip({ children, content }: ViewerTooltipProps) {
  const hasProvider = useContext(ViewerUiContext) !== null;
  const tooltip = (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
  return hasProvider ? (
    tooltip
  ) : (
    <TooltipProvider delayDuration={350}>{tooltip}</TooltipProvider>
  );
}

const defaultComponents: ViewerUiComponents = {
  Button: ShadcnButton,
  Tooltip: DefaultTooltip,
};
const ViewerUiContext = createContext<ViewerUiComponents | null>(null);

export function ViewerUiProvider({
  components,
  children,
}: {
  components?: Partial<ViewerUiComponents>;
  children: ReactNode;
}) {
  const inherited = useContext(ViewerUiContext) ?? defaultComponents;
  const value = useMemo(
    () => ({ ...inherited, ...components }),
    [inherited, components],
  );
  return (
    <ViewerUiContext.Provider value={value}>
      <TooltipProvider delayDuration={350}>{children}</TooltipProvider>
    </ViewerUiContext.Provider>
  );
}

export type ViewerControlButtonProps = ComponentProps<typeof ShadcnButton> & {
  /** Override the accessible-label tooltip, or use false to disable it. */
  tooltip?: ReactNode | false;
};

export function ViewerControlButton({
  title,
  tooltip,
  type = "button",
  ...props
}: ViewerControlButtonProps) {
  const { Button, Tooltip: TooltipImpl } =
    useContext(ViewerUiContext) ?? defaultComponents;
  const label =
    tooltip === undefined ? (title ?? props["aria-label"]) : tooltip;
  const button = <Button type={type} {...props} />;
  return label ? <TooltipImpl content={label}>{button}</TooltipImpl> : button;
}
