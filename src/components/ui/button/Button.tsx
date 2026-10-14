import React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import clsx from "clsx";
import styles from "./Button.module.scss";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline-lime";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  asChild?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      asChild = false,
      children,
      disabled,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={clsx(
          styles.button,
          styles[variant],
          styles[size],
          loading && styles.loading,
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className={styles.spinner} aria-hidden="true" />
        ) : (
          leftIcon && <span className={styles.iconWrapper}>{leftIcon}</span>
        )}
        <Slottable>{children}</Slottable>
        {!loading && rightIcon && <span className={styles.iconWrapper}>{rightIcon}</span>}
      </Comp>
    );
  }
);

Button.displayName = "Button";
