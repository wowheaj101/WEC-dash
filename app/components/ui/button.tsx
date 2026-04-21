import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/app/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[10px] font-medium transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50 font-mono',
  {
    variants: {
      variant: {
        default:  'bg-surface3 text-foreground border border-border hover:bg-surface2',
        ghost:    'bg-transparent text-muted-foreground border border-transparent hover:bg-surface2 hover:text-foreground',
        active:   'bg-surface2 text-foreground border border-border',
        danger:   'bg-[hsl(var(--danger-bg))] text-[hsl(var(--danger))] border border-[hsl(var(--danger-border))] hover:bg-[hsl(var(--danger)/0.2)]',
        live:     'bg-[hsl(var(--live-bg))] text-[hsl(var(--live))] border border-[hsl(var(--live-border))]',
        accent:   'bg-[hsl(var(--pit-bg))] text-[hsl(var(--pit))] border border-[hsl(var(--pit-border))] hover:bg-[hsl(var(--pit)/0.2)]',
      },
      size: {
        default: 'h-7 px-3 py-1',
        sm:      'h-6 px-2 py-0.5 text-[9px]',
        lg:      'h-8 px-4 py-1.5',
        icon:    'h-7 w-7 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
