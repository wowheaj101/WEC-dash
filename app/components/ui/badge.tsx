import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/app/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[9px] font-medium tracking-wide transition-colors uppercase',
  {
    variants: {
      variant: {
        default:  'border-border bg-surface2 text-foreground',
        hypercar: 'border-[hsl(var(--hypercar)/0.4)] bg-[hsl(var(--hypercar)/0.12)] text-[hsl(var(--hypercar))]',
        lmp2:     'border-[hsl(var(--lmp2)/0.4)]     bg-[hsl(var(--lmp2)/0.12)]     text-[hsl(var(--lmp2))]',
        lmgt3:    'border-[hsl(var(--lmgt3)/0.4)]    bg-[hsl(var(--lmgt3)/0.12)]    text-[hsl(var(--lmgt3))]',
        live:     'border-[hsl(var(--live-border))]   bg-[hsl(var(--live-bg))]       text-[hsl(var(--live))]',
        pit:      'border-[hsl(var(--pit-border))]    bg-[hsl(var(--pit-bg))]        text-[hsl(var(--pit))]',
        danger:   'border-[hsl(var(--danger-border))] bg-[hsl(var(--danger-bg))]    text-[hsl(var(--danger))]',
        warning:  'border-[hsl(var(--warning-border))]bg-[hsl(var(--warning-bg))]   text-[hsl(var(--warning))]',
        info:     'border-[hsl(var(--info-border))]   bg-[hsl(var(--info-bg))]       text-[hsl(var(--info))]',
        purple:   'border-[hsl(var(--purple-border))] bg-[hsl(var(--purple-bg))]    text-[hsl(var(--purple))]',
        muted:    'border-transparent bg-transparent text-muted-foreground',
        outline:  'border-border bg-transparent text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
