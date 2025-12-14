"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-[var(--background-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={cn(
                "p-6 border-b border-[var(--border)]",
                variant === "danger" && "bg-red-500/10",
                variant === "warning" && "bg-yellow-500/10",
                variant === "info" && "bg-blue-500/10"
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0",
                    variant === "danger" && "bg-red-500/20",
                    variant === "warning" && "bg-yellow-500/20",
                    variant === "info" && "bg-blue-500/20"
                  )}>
                    <AlertTriangle className={cn(
                      "h-6 w-6",
                      variant === "danger" && "text-red-500",
                      variant === "warning" && "text-yellow-500",
                      variant === "info" && "text-blue-500"
                    )} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-[var(--foreground)] mb-1">
                      {title}
                    </h3>
                    <p className="text-[var(--foreground-muted)]">
                      {message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 flex items-center justify-end gap-3 bg-[var(--background-tertiary)]">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  {cancelText}
                </Button>
                <Button
                  variant={variant === "info" ? "primary" : variant === "warning" ? "danger" : variant}
                  onClick={handleConfirm}
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  {confirmText}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
