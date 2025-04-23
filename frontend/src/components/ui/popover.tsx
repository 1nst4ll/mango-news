"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=fade-out]:fade-out data-[state=slide-out-to-bottom]:slide-out-to-bottom data-[state=slide-out-to-left]:slide-out-to-left data-[state=slide-out-to-right]:slide-out-to-right data-[state=slide-out-to-top]:slide-out-to-top data-[state=fade-in]:fade-in data-[state=slide-in-from-bottom]:slide-in-from-bottom data-[state=slide-in-from-left]:slide-in-from-left data-[state=slide-in-from-right]:slide-in-from-right data-[state=slide-in-from-top]:slide-in-from-top",
      className
    )}
    {...props}
  />
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
