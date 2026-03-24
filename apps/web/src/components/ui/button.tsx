"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800",
  secondary: "bg-brand-100 text-brand-900 hover:bg-brand-200",
  outline: "border border-brand-300 bg-white text-brand-800 hover:bg-brand-50",
  danger: "border border-red-300 bg-red-600 text-white hover:bg-red-700",
  ghost: "text-brand-800 hover:bg-brand-100",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "rounded-lg px-3 py-1.5 text-xs font-semibold",
  md: "rounded-xl px-4 py-2 text-sm font-semibold",
  lg: "rounded-xl px-5 py-3 text-sm font-semibold",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const buttonClassName = (
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) =>
  cn(
    "inline-flex items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-55",
    variantClass[variant],
    sizeClass[size],
    className,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={buttonClassName(variant, size, className)}
        {...props}
      />
    );
  },
);
