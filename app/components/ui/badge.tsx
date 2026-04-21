import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/app/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold tracking-[1.2px] uppercase transition-colors disp',
  {
    variants: {
      variant: {
        default:  'border-line2 bg-bg2 text-fg1',
        hypercar: 'border-hypercar/50 bg-hypercar/15 text-hypercar',
        lmp2:     'border-lmp2/50     bg-lmp2/15     text-lmp2',
        lmgt3:    'border-lmgt3/50    bg-lmgt3/15    text-lmgt3',
        live:     'border-[hsl(var(--live-border))]    bg-[hsl(var(--live-bg))]    text-live',
        pit:      'border-[hsl(var(--pit-border))]     bg-[hsl(var(--pit-bg))]     text-pit',
        danger:   'border-[hsl(var(--danger-border))]  bg-[hsl(var(--danger-bg))]  text-danger',
        warning:  'border-[hsl(var(--warning-border))] bg-[hsl(var(--warning-bg))] text-warning',
        info:     'border-[hsl(var(--info-border))]    bg-[hsl(var(--info-bg))]    text-info',
        purple:   'border-[hsl(var(--purple-border))]  bg-[hsl(var(--purple-bg))]  text-fastest',
        muted:    'border-transparent bg-transparent  text-fg3',
        outline:  'border-line2 bg-transparent        text-fg1',
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
