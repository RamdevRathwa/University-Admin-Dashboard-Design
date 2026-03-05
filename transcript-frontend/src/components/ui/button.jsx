import * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = {
  default: "bg-[#1e40af] text-white hover:bg-[#1e3a8a]",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
  outline:
    "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  ghost: "bg-transparent text-gray-900 hover:bg-gray-100 dark:text-slate-100 dark:hover:bg-slate-800",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

const sizeVariants = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  lg: "h-11 px-6",
  icon: "h-10 w-10 p-0",
};

export const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", type = "button", asChild = false, children, ...props }, ref) => {
    const classes = cn(
      "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none",
      buttonVariants[variant] || buttonVariants.default,
      sizeVariants[size] || sizeVariants.default,
      className
    );

    if (asChild && React.isValidElement(children)) {
      const childClassName = cn(children.props.className, classes);
      return React.cloneElement(children, { ...props, className: childClassName, ref });
    }

    return (
      <button ref={ref} type={type} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
