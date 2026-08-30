"use client";
import { cn } from "@/lib/utils";
import { InputHTMLAttributes, ReactNode, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, leftIcon, hint, className, id, type, ...props },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || props.name;
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-3 flex items-center text-muted-foreground pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={cn(
            "h-[50px] w-full rounded-[10px] border border-transparent bg-foreground/[0.04] px-3.5 text-sm tracking-[-0.14px] text-foreground placeholder:font-light placeholder:text-foreground/40",
            "focus-visible:outline-none focus-visible:border-primary",
            "disabled:opacity-50 transition-colors",
            leftIcon && "pl-10",
            isPassword && "pr-10",
            error && "border-destructive",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
});
