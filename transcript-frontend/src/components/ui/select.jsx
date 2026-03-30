import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

const SelectContext = React.createContext(null);

function extractText(node) {
  if (node === null || node === undefined || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) return extractText(node.props?.children);
  return "";
}

export function Select({ value, defaultValue, onValueChange, disabled, children }) {
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);
  const [labels, setLabels] = React.useState(() => new Map());
  const triggerRef = React.useRef(null);
  const current = value !== undefined ? value : internal;

  const setValue = (v) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
    setOpen(false);
  };

  const registerLabel = React.useCallback((v, label) => {
    const key = String(v);
    const val = String(label ?? "");
    setLabels((prev) => {
      if (!val) return prev;
      if (prev.get(key) === val) return prev;
      const next = new Map(prev);
      next.set(key, val);
      return next;
    });
  }, []);

  const getLabel = React.useCallback(
    (v) => {
      const key = String(v ?? "");
      return labels.get(key) || "";
    },
    [labels]
  );

  return (
    <SelectContext.Provider
      value={React.useMemo(
        () => ({ value: current, setValue, open, setOpen, disabled: !!disabled, registerLabel, getLabel, triggerRef }),
        [current, open, disabled, registerLabel, getLabel]
      )}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }) {
  const ctx = React.useContext(SelectContext);

  const handleToggle = React.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (ctx?.disabled) return;
      ctx?.setOpen(!ctx?.open);
    },
    [ctx]
  );

  return (
    <button
      ref={ctx?.triggerRef}
      type="button"
      disabled={ctx?.disabled}
      aria-expanded={!!ctx?.open}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 disabled:opacity-50",
        className
      )}
      onMouseDown={handleToggle}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-gray-400 dark:text-slate-500 transition-all duration-200 ease-out",
          ctx?.open ? "rotate-180 text-[#1e40af] dark:text-sky-300" : ""
        )}
        aria-hidden="true"
      />
    </button>
  );
}

export function SelectValue({ placeholder }) {
  const ctx = React.useContext(SelectContext);
  const label = ctx?.value ? ctx?.getLabel?.(ctx.value) : "";
  const text = label || "";
  return (
    <span className={cn("truncate", text ? "text-gray-900 dark:text-slate-100" : "text-gray-500 dark:text-slate-400")}>
      {text || placeholder}
    </span>
  );
}

export function SelectContent({ className, children }) {
  const ctx = React.useContext(SelectContext);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!ctx?.open) return;
    const onDown = (e) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      if (ctx?.triggerRef?.current?.contains?.(e.target)) return;
      ctx.setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ctx?.open, ctx]);

  return (
    // Keep mounted even when closed so SelectItem effects can register labels.
    <div
      ref={ref}
      aria-hidden={!ctx?.open}
      className={cn(
        "absolute z-[95] mt-2 w-full origin-top rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg overflow-hidden transition-all duration-220 ease-out will-change-transform",
        ctx?.open
          ? "visible translate-y-0 scale-100 opacity-100"
          : "pointer-events-none invisible -translate-y-1.5 scale-[0.98] opacity-0",
        className
      )}
    >
      <div className="max-h-60 overflow-y-auto scroll-smooth p-1">{children}</div>
    </div>
  );
}

export function SelectItem({ value, className, children, textValue, disabled = false }) {
  const ctx = React.useContext(SelectContext);
  const selected = String(ctx?.value) === String(value);

  const label = React.useMemo(() => {
    return (textValue !== undefined ? String(textValue) : extractText(children)).trim();
  }, [children, textValue]);

  React.useEffect(() => {
    ctx?.registerLabel?.(value, label);
  }, [ctx?.registerLabel, value, label]);

  return (
    <button
      type="button"
      className={cn(
        "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-slate-200 transition-all duration-150 ease-out hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]",
        disabled ? "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-gray-700 dark:hover:bg-transparent dark:hover:text-slate-200" : "",
        selected ? "bg-blue-50 text-[#1e40af] dark:bg-slate-800 dark:text-sky-300 font-medium" : "",
        className
      )}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        ctx?.setValue(value);
      }}
    >
      <span className="truncate">{children}</span>
      {selected ? (
        <Check className="h-4 w-4 shrink-0 text-[#1e40af] dark:text-sky-300" aria-hidden="true" />
      ) : null}
    </button>
  );
}
