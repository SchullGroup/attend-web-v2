"use client";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes } from "react";

// Styling adopted from the figma-redesign branch (flat/minimal). Prop API is
// unchanged from before the redesign, so every existing call site still compiles;
// only the look changes (theme-driven bg-foreground/text-background, font-medium
// + tracking, soft shadow on the default variant, rounded-lg/xl on sm/lg). This
// ripples app-wide by design — the whole app moves to the new design system.
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "default",
  size = "md",
  loading,
  fullWidth,
  className,
  children,
  disabled,
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium tracking-[-0.14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    default: "bg-foreground text-background hover:bg-foreground/90 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.1)]",
    outline: "border border-foreground/[0.06] bg-transparent hover:bg-foreground/[0.04] text-foreground",
    ghost: "bg-transparent hover:bg-foreground/[0.04] text-foreground",
    destructive: "bg-destructive text-white hover:bg-destructive/90",
  };
  const sizes = {
    sm: "h-9 px-3 text-sm rounded-lg",
    md: "h-10 px-5 text-sm",
    lg: "h-[50px] px-6 text-sm rounded-xl",
  };
  return (
    <button
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
