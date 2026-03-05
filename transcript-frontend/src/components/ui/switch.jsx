import * as React from "react";

// Minimal switch component (shadcn-like) since the project doesn't include one yet.
export const Switch = React.forwardRef(function Switch(
  { checked, defaultChecked, onCheckedChange, disabled, className = "", ...props },
  ref
) {
  const [internal, setInternal] = React.useState(Boolean(defaultChecked));
  const isControlled = typeof checked === "boolean";
  const value = isControlled ? checked : internal;

  const setValue = (next) => {
    if (!isControlled) setInternal(next);
    onCheckedChange?.(next);
  };

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        setValue(!value);
      }}
      className={[
        "inline-flex h-6 w-11 items-center rounded-full border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af] focus-visible:ring-offset-2",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        value ? "bg-[#1e40af] border-[#1e40af]" : "bg-gray-200 border-gray-200",
        className,
      ].join(" ")}
      {...props}
    >
      <span
        className={[
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          value ? "translate-x-5" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
});

