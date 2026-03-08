import React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
        className
      )}
      {...props}
    />
  );
});
