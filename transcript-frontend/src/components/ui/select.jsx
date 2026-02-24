import * as React from "react";
import { cn } from "../../lib/utils";

const SelectContext = React.createContext(null);

export function Select({ value, defaultValue, onValueChange, disabled, children }) {
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);
  const current = value !== undefined ? value : internal;

  const setValue = (v) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value: current, setValue, open, setOpen, disabled: !!disabled }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }) {
  const ctx = React.useContext(SelectContext);
  return (
    <button
      type="button"
      disabled={ctx?.disabled}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af] focus-visible:ring-offset-2 disabled:opacity-50",
        className
      )}
      onClick={() => !ctx?.disabled && ctx?.setOpen(!ctx.open)}
      {...props}
    >
      {children}
      <span className="text-gray-400" aria-hidden="true">
        v
      </span>
    </button>
  );
}

export function SelectValue({ placeholder }) {
  const ctx = React.useContext(SelectContext);
  return <span className={cn("truncate", ctx?.value ? "text-gray-900" : "text-gray-500")}>{ctx?.value || placeholder}</span>;
}

export function SelectContent({ className, children }) {
  const ctx = React.useContext(SelectContext);
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
    <div ref={ref} className={cn("absolute z-[95] mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden", className)}>
      <div className="max-h-60 overflow-auto p-1">{children}</div>
    </div>
  );
}

export function SelectItem({ value, className, children }) {
  const ctx = React.useContext(SelectContext);
  const selected = String(ctx?.value) === String(value);
  return (
    <button
      type="button"
      className={cn(
        "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]",
        selected ? "bg-blue-50 text-[#1e40af] font-medium" : "",
        className
      )}
      onClick={() => ctx?.setValue(value)}
    >
      <span className="truncate">{children}</span>
      {selected ? (
        <span className="text-[#1e40af]" aria-hidden="true">
          OK
        </span>
      ) : null}
    </button>
  );
}

