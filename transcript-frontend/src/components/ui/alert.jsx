import * as React from "react";
import { cn } from "../../lib/utils";

export function Alert({ className, variant = "default", ...props }) {
  return (
    <div
      role="alert"
      className={cn(
        "fixed right-4 top-4 z-[120] w-[calc(100vw-2rem)] max-w-md rounded-xl border p-4 text-sm shadow-2xl backdrop-blur animate-in fade-in slide-in-from-top-2",
        variant === "destructive"
          ? "border-red-200 bg-red-50/95 text-red-800 dark:border-red-900/60 dark:bg-red-950/95 dark:text-red-100"
          : "border-blue-200 bg-white/95 text-gray-900 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100",
        className
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }) {
  return <h5 className={cn("mb-1 font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function AlertDescription({ className, ...props }) {
  return <div className={cn("text-sm text-current/90", className)} {...props} />;
}
