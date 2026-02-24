import * as React from "react";
import { cn } from "../../lib/utils";

export function Toast({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-xl border p-4 shadow-lg bg-white",
        variant === "destructive" ? "border-red-200" : "border-gray-200",
        className
      )}
      {...props}
    />
  );
}

export function ToastTitle({ className, ...props }) {
  return <div className={cn("text-sm font-semibold text-gray-900", className)} {...props} />;
}

export function ToastDescription({ className, ...props }) {
  return <div className={cn("text-sm text-gray-600 mt-1", className)} {...props} />;
}

