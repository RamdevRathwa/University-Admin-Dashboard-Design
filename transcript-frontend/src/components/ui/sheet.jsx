import * as React from "react";
import { cn } from "../../lib/utils";

const SheetContext = React.createContext(null);

export function Sheet({ open, onOpenChange, children }) {
  return <SheetContext.Provider value={{ open: !!open, onOpenChange }}>{children}</SheetContext.Provider>;
}

export function SheetTrigger({ asChild, children, ...props }) {
  const ctx = React.useContext(SheetContext);
  if (asChild) {
    return React.cloneElement(children, {
      ...props,
      onClick: (e) => {
        children.props?.onClick?.(e);
        ctx?.onOpenChange?.(true);
      },
    });
  }
  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        ctx?.onOpenChange?.(true);
      }}
    >
      {children}
    </button>
  );
}

export function SheetContent({ side = "left", className, children }) {
  const ctx = React.useContext(SheetContext);
  if (!ctx?.open) return null;

  const sideClass = side === "right" ? "right-0" : "left-0";

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={() => ctx?.onOpenChange?.(false)}
      />
      <div className={cn("absolute top-0 bottom-0 w-[320px] bg-white shadow-xl border border-gray-200 p-4", sideClass, className)}>
        {children}
      </div>
    </div>
  );
}

