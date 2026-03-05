import * as React from "react";
import { cn } from "../../lib/utils";

export const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className={cn("w-full overflow-auto", className)}>
    <table ref={ref} className="w-full caption-bottom text-sm" {...props} />
  </div>
));
Table.displayName = "Table";

export const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-gray-100 dark:border-slate-800 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-11 px-6 text-left align-middle font-semibold text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-slate-900",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("p-4 px-6 align-middle text-gray-700 dark:text-slate-200", className)} {...props} />
));
TableCell.displayName = "TableCell";

export const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-gray-500 dark:text-slate-400", className)} {...props} />
));
TableCaption.displayName = "TableCaption";
