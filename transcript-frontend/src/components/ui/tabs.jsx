import * as React from "react";
import { cn } from "../../lib/utils";

const TabsContext = React.createContext(null);

export function Tabs({ value, defaultValue, onValueChange, className, children, ...props }) {
  const [internal, setInternal] = React.useState(defaultValue || "");
  const currentValue = value !== undefined ? value : internal;

  const setValue = (v) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }) {
  return (
    <div
      className={cn("inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-1 text-gray-600", className)}
      role="tablist"
      {...props}
    />
  );
}

export function TabsTrigger({ className, value, ...props }) {
  const ctx = React.useContext(TabsContext);
  const active = ctx?.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx?.setValue(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af] disabled:pointer-events-none disabled:opacity-50",
        active ? "bg-white text-[#1e40af] shadow-sm" : "text-gray-700 hover:text-gray-900",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, value, ...props }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;
  return <div role="tabpanel" className={cn("mt-4", className)} {...props} />;
}

