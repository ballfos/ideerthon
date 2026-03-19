import { cn } from "#/utils/ui/cn"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-2xl font-black tracking-widest transition-all duration-100 disabled:opacity-50 disabled:pointer-events-none hover:brightness-105 active:brightness-95 active:translate-y-[14px] border-t-[2px] border-b-[12px] border-x-[4px] active:border-b-[2px] active:mb-[10px]",
    {
        defaultVariants: {
            size: "default",
            variant: "yellow",
        },
        variants: {
            size: {
                default: "h-12 px-6 py-2 text-base",
                icon: "h-12 w-12",
                lg: "h-14 px-8 py-3 text-lg",
                sm: "h-9 px-4 py-1 text-sm active:translate-y-[3px]",
            },
            variant: {
                blue:
                    "bg-white text-[#3788af] border-[#1e4d66] shadow-[0_4px_0_0_#1e4d66] hover:bg-[#dbeafe] active:shadow-none active:bg-[#1e4d66] active:text-white",
                ghost:
                    "shadow-none active:translate-y-[2px] hover:bg-black/5 text-[#7a6446] font-bold active:bg-black/10 border-transparent active:mb-0",
                green:
                    "bg-white text-[#4b9635] border-[#2d5a27] shadow-[0_4px_0_0_#2d5a27] hover:bg-[#dcfce7] active:shadow-none active:bg-[#2d5a27] active:text-white",
                red:
                    "bg-white text-[#c7453c] border-[#8b251e] shadow-[0_4px_0_0_#8b251e] hover:bg-[#fee2e2] active:shadow-none active:bg-[#8b251e] active:text-white",
                wood:
                    "bg-white text-[#8B5E3C] border-[#5C3A21] shadow-[0_4px_0_0_#5C3A21] hover:bg-[#f5ece3] active:shadow-none active:bg-[#5C3A21] active:text-white",
                yellow:
                    "bg-white text-[#b58941] border-[#8c662d] shadow-[0_4px_0_0_#8c662d] hover:bg-[#fef9c3] active:shadow-none active:bg-[#8c662d] active:text-white",
            },
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, size, variant, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ className, size, variant }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
