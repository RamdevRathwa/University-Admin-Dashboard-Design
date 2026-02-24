import * as React from "react";
import { cn } from "../../lib/utils";

const DropdownContext = React.createContext(null);

export function DropdownMenu({ open, onOpenChange, children }) {
  const [internal, setInternal] = React.useState(false);
  const isOpen = open !== undefined ? open : internal;
  const setOpen = (v) => {
    if (open === undefined) setInternal(v);
    onOpenChange?.(v);
  };

  return <DropdownContext.Provider value={{ open: isOpen, setOpen }}>{children}</DropdownContext.Provider>;
}

export function DropdownMenuTrigger({ asChild, children, ...props }) {
  const ctx = React.useContext(DropdownContext);
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

export function DropdownMenuContent({ className, align = "end", children }) {
  const ctx = React.useContext(DropdownContext);
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
    <div
      ref={ref}
      className={cn(
        "absolute z-[95] mt-2 min-w-56 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg",
        align === "start" ? "left-0" : "right-0",
        className
      )}
      role="menu"
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ className, inset, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]",
        inset ? "pl-8" : "",
        className
      )}
      role="menuitem"
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className }) {
  return <div className={cn("my-1 h-px bg-gray-200", className)} role="separator" />;
}

