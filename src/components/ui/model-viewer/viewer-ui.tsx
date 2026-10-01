import { createContext, useContext, type ComponentProps, type ComponentType, type ReactElement, type ReactNode } from "react";
import { Button as ShadcnButton } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type ViewerTooltipProps = { children: ReactElement; content: ReactNode };
export type ViewerUiComponents = {
  /** Forward the ref, event handlers, aria attributes, and className to the underlying button. */
  Button: ComponentType<ComponentProps<typeof ShadcnButton>>;
  /** Render children as the trigger, preserving its ref and event handlers. */
  Tooltip: ComponentType<ViewerTooltipProps>;
};

function DefaultTooltip({ children, content }: ViewerTooltipProps) {
  return <TooltipProvider delayDuration={350}><Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent>{content}</TooltipContent></Tooltip></TooltipProvider>;
}

const ViewerUiContext = createContext<ViewerUiComponents>({ Button: ShadcnButton, Tooltip: DefaultTooltip });

export function ViewerUiProvider({ components, children }: { components?: Partial<ViewerUiComponents>; children: ReactNode }) {
  const inherited = useContext(ViewerUiContext);
  return <ViewerUiContext.Provider value={{ ...inherited, ...components }}>{children}</ViewerUiContext.Provider>;
}

export function ViewerControlButton({ title, ...props }: ComponentProps<typeof ShadcnButton>) {
  const { Button, Tooltip: TooltipImpl } = useContext(ViewerUiContext);
  const label = title ?? props["aria-label"];
  const button = <Button {...props} />;
  return label ? <TooltipImpl content={label}>{button}</TooltipImpl> : button;
}
