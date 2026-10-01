import * as React from "react";

import { cn } from "@/lib/utils";

function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert" role="alert" className={cn("relative w-full rounded-lg border border-destructive/30 bg-background/95 px-4 py-3 text-sm text-destructive shadow-sm", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("text-sm leading-relaxed", className)} {...props} />;
}

export { Alert, AlertDescription };

