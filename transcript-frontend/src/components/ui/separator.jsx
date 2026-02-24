import * as React from "react";
import { cn } from "../../lib/utils";

export const Separator = React.forwardRef(({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    aria-orientation={orientation}
    className={cn(orientation === "horizontal" ? "h-px w-full bg-gray-200" : "w-px h-full bg-gray-200", className)}
    {...props}
  />
));
Separator.displayName = "Separator";

