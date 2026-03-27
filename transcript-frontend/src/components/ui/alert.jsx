import * as React from "react";
import { cn } from "../../lib/utils";

export function Alert({ className, variant = "default", ...props }) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-xl border p-4 text-sm",
        variant === "destructive"
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          : "border-gray-200 bg-white text-gray-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
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
  return <div className={cn("text-sm text-gray-700 dark:text-slate-300", className)} {...props} />;
}
