"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react'; // Import icons

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3">
              {variant === 'destructive' && <XCircle className="h-6 w-6 text-destructive-foreground" />}
              {variant === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
              {variant === 'warning' && <AlertTriangle className="h-6 w-6 text-yellow-500" />}
              {variant === 'info' && <Info className="h-6 w-6 text-blue-500" />}
              {variant === 'default' && <Info className="h-6 w-6 text-gray-500" />} {/* Default info icon */}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
