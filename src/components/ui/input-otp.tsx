import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

const inputOTPVariants = cva(
  "flex items-center gap-2 has-[:disabled]:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        destructive: "",
      },
      size: {
        sm: "gap-1.5",
        default: "gap-2",
        lg: "gap-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const inputOTPSlotVariants = cva(
  "relative flex items-center justify-center border bg-[var(--input-bg)] text-[var(--text-primary)] font-[family-name:var(--font-heading)] font-bold uppercase transition-all focus-within:z-10 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-[rgba(176,141,87,0.28)]",
        destructive:
          "border-[var(--action)] text-[var(--text-primary)] focus-within:ring-[rgba(122,46,58,0.45)]",
      },
      size: {
        sm: "h-10 w-10 text-base",
        default: "h-12 w-12 text-lg tracking-[0.08em]",
        lg: "h-14 w-14 text-xl tracking-[0.1em]",
      },
      state: {
        default: "",
        active:
          "border-[rgba(176,141,87,0.75)] ring-2 ring-[rgba(176,141,87,0.28)] ring-offset-2 ring-offset-[var(--bg-main)]",
        filled:
          "bg-[rgba(176,141,87,0.12)] border-[rgba(176,141,87,0.5)] text-[var(--accent)]",
      },
      position: {
        first: "rounded-l-[12px]",
        middle: "rounded-[8px]",
        last: "rounded-r-[12px]",
        single: "rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default",
      position: "middle",
    },
  }
);

export interface InputOTPProps {
  maxLength: number;
  value?: string;
  onChange?: (newValue: string) => void;
  onComplete?: (newValue: string) => void;
  disabled?: boolean;
  pattern?: string;
  className?: string;
  containerClassName?: string;
  animated?: boolean;
  variant?: "default" | "destructive";
  otpSize?: "sm" | "default" | "lg";
  children?: React.ReactNode;
  autoFocus?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  "aria-label"?: string;
}

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  InputOTPProps
>(
  (
    {
      className,
      containerClassName,
      variant,
      otpSize,
      animated = true,
      children,
      ...props
    },
    ref
  ) => (
    <OTPInput
      ref={ref}
      containerClassName={cn(
        inputOTPVariants({ variant, size: otpSize }),
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    >
      {children}
    </OTPInput>
  )
);
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> &
    Omit<VariantProps<typeof inputOTPVariants>, "size"> & {
      otpSize?: "sm" | "default" | "lg";
    }
>(({ className, variant, otpSize, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(inputOTPVariants({ variant, size: otpSize }), className)}
    {...props}
  />
));
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> &
    Omit<VariantProps<typeof inputOTPSlotVariants>, "size"> & {
      index: number;
      animated?: boolean;
      otpSize?: "sm" | "default" | "lg";
    }
>(
  (
    { index, className, variant, otpSize, state, animated = true, ...props },
    ref
  ) => {
    const inputOTPContext = React.useContext(OTPInputContext);
    const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];

    const currentState = isActive ? "active" : char ? "filled" : "default";

    const totalSlots = inputOTPContext.slots.length;
    const position =
      totalSlots === 1
        ? "single"
        : index === 0
          ? "first"
          : index === totalSlots - 1
            ? "last"
            : "middle";

    const slotContent = (
      <div
        ref={ref}
        className={cn(
          inputOTPSlotVariants({
            variant,
            size: otpSize,
            state: state || currentState,
            position,
          }),
          className
        )}
        {...props}
      >
        {char}
        {hasFakeCaret && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <motion.div
              className="h-4 w-px bg-[var(--accent)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        )}
      </div>
    );

    if (!animated) return slotContent;

    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.2,
          delay: index * 0.05,
          ease: "easeOut",
        }}
      >
        {slotContent}
      </motion.div>
    );
  }
);
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & VariantProps<typeof inputOTPVariants>
>(({ size, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cn(
      "flex items-center justify-center text-[var(--text-muted)]",
      size === "sm"
        ? "text-xs"
        : size === "lg"
          ? "text-base"
          : "text-sm"
    )}
    {...props}
  >
    -
  </div>
));
InputOTPSeparator.displayName = "InputOTPSeparator";

export {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
  inputOTPVariants,
  inputOTPSlotVariants,
};
