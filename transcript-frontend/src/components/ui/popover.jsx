import * as React from "react";
import { cn } from "../../lib/utils";

const PopoverContext = React.createContext(null);

export function Popover({ open, onOpenChange, children }) {
  const [internal, setInternal] = React.useState(false);
  const isOpen = open !== undefined ? open : internal;
  const setOpen = (v) => {
    if (open === undefined) setInternal(v);
    onOpenChange?.(v);
  };
  return <PopoverContext.Provider value={{ open: isOpen, setOpen }}>{children}</PopoverContext.Provider>;
}

export function PopoverTrigger({ asChild, children, ...props }) {
  const ctx = React.useContext(PopoverContext);
  if (asChild) {
    return React.cloneElement(children, {
      ...props,
      onClick: (e) => {
        children.props?.onClick?.(e);
        ctx?.setOpen(!ctx.open);
      },
    });
  }
  return (
    <button type="button" {...props} onClick={() => ctx?.setOpen(!ctx.open)}>
      {children}
    </button>
  );
}

export function PopoverContent({ className, children }) {
  const ctx = React.useContext(PopoverContext);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!ctx?.open) return;
    const onDown = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) ctx.setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ctx?.open, ctx]);

  if (!ctx?.open) return null;
  return (
    <div ref={ref} className={cn("absolute z-[95] mt-2 rounded-xl border border-gray-200 bg-white shadow-lg", className)}>
      {children}
    </div>
  );
}

