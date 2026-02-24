import { useEffect, useMemo, useRef } from "react";
import { Input } from "./ui/input";

export default function OtpInput({ value = "", onChange, error, length = 6, autoFocus = true }) {
  const inputRefs = useRef([]);

  const chars = useMemo(
    () => Array.from({ length }, (_, index) => String(value || "")[index] || ""),
    [value, length]
  );

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
  }, [autoFocus]);

  const updateAt = (index, nextChar) => {
    const next = [...chars];
    next[index] = nextChar;
    onChange(next.join(""));
  };

  const handleChange = (index, nextValue) => {
    if (nextValue && !/^\d$/.test(nextValue)) return;
    updateAt(index, nextValue);
    if (nextValue && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!chars[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        return;
      }
      updateAt(index, "");
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(pasted)) return;

    const digits = pasted.slice(0, length).split("");
    const next = Array.from({ length }, (_, i) => digits[i] || "");
    onChange(next.join(""));
    inputRefs.current[Math.min(digits.length, length) - 1]?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-2">
        {Array.from({ length }).map((_, index) => (
          <Input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={chars[index]}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={index === 0 ? handlePaste : undefined}
            className={`w-14 h-14 text-center text-xl font-semibold ${
              error ? "border-red-500 bg-red-50 focus-visible:ring-red-500" : "border-gray-300"
            }`}
            aria-label={`OTP digit ${index + 1}`}
          />
        ))}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
