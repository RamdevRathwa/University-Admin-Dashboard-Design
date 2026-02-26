import { Input } from "../ui/input";
import { cn } from "../../lib/utils";
import React from "react";

export default function SearchBar({ value, onChange, placeholder = "Search...", ariaLabel = "Search", rightSlot }) {
  const hasSlot = !!rightSlot;

  const slotNode =
    hasSlot && React.isValidElement(rightSlot)
      ? React.cloneElement(rightSlot, {
          className: cn("h-10 rounded-l-none", rightSlot.props.className),
        })
      : rightSlot;

  return (
    <div className="flex items-stretch w-full">
      <div className="relative flex-1 min-w-0">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn("pl-11", hasSlot ? "rounded-r-none border-r-0" : "")}
        />
      </div>
      {hasSlot ? <div className="shrink-0">{slotNode}</div> : null}
    </div>
  );
}
