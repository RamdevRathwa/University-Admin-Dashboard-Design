import * as React from "react";
import { cn } from "../../lib/utils";

const variants = {
  default: "bg-blue-50 text-[#1e40af] border-blue-100 dark:bg-slate-800 dark:text-sky-300 dark:border-slate-700",
  success: "bg-green-50 text-green-700 border-green-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60",
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
  destructive: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60",
  neutral: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
};

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}
