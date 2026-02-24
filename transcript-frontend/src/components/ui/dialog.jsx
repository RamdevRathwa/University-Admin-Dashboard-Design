import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

const DialogContext = React.createContext(null);

export function Dialog({ open, onOpenChange, children }) {
  return <DialogContext.Provider value={{ open: !!open, onOpenChange }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ asChild, children, ...props }) {
  const ctx = React.useContext(DialogContext);
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
    <Button
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        ctx?.onOpenChange?.(true);
      }}
    >
      {children}
    </Button>
  );
}

export function DialogContent({ className, children, ...props }) {
  const ctx = React.useContext(DialogContext);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (ctx?.open) el.showModal();
    else if (el.open) el.close();
  }, [ctx?.open]);

  return (
    <dialog
      ref={ref}
      className={cn("rounded-xl border border-gray-200 p-0 shadow-xl backdrop:bg-black/40", className)}
      onClose={() => ctx?.onOpenChange?.(false)}
      {...props}
    >
      <div className="p-6">{children}</div>
    </dialog>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("flex flex-col space-y-1.5", className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return <h2 className={cn("text-lg font-semibold text-gray-900", className)} {...props} />;
}

export function DialogDescription({ className, ...props }) {
  return <p className={cn("text-sm text-gray-500", className)} {...props} />;
}

export function DialogFooter({ className, ...props }) {
  return <div className={cn("mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3", className)} {...props} />;
}

