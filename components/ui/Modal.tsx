import { forwardRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils/cn';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Modal Component
 *
 * Accessible modal dialog built with Radix UI Dialog.
 * Features animations, backdrop, and keyboard handling.
 */

export interface ModalProps {
  /** Control open state */
  open: boolean;
  /** Callback when modal state changes */
  onOpenChange: (open: boolean) => void;
  /** Modal title */
  title?: string;
  /** Modal description */
  description?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Show close button */
  showCloseButton?: boolean;
  /** Prevent closing on backdrop click */
  preventClose?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
};

/**
 * Modal component with animations
 *
 * @example
 * ```tsx
 * <Modal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Confirm Action"
 *   description="Are you sure you want to proceed?"
 *   size="md"
 * >
 *   <div className="space-y-4">
 *     <p>This action cannot be undone.</p>
 *     <div className="flex justify-end gap-2">
 *       <Button variant="secondary" onClick={() => setIsOpen(false)}>
 *         Cancel
 *       </Button>
 *       <Button variant="danger" onClick={handleConfirm}>
 *         Confirm
 *       </Button>
 *     </div>
 *   </div>
 * </Modal>
 * ```
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onOpenChange,
      title,
      description,
      children,
      size = 'md',
      showCloseButton = true,
      preventClose = false,
    },
    ref
  ) => {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <AnimatePresence>
          {open && (
            <Dialog.Portal forceMount>
              {/* Backdrop */}
              <Dialog.Overlay asChild>
                <motion.div
                  className="fixed inset-0 bg-black/50 z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </Dialog.Overlay>

              {/* Modal Content */}
              <Dialog.Content
                ref={ref}
                asChild
                onPointerDownOutside={(e) => {
                  if (preventClose) {
                    e.preventDefault();
                  }
                }}
                onEscapeKeyDown={(e) => {
                  if (preventClose) {
                    e.preventDefault();
                  }
                }}
              >
                <motion.div
                  className={cn(
                    'fixed left-1/2 top-1/2 z-50 w-full',
                    'bg-white rounded-lg shadow-xl',
                    'focus:outline-none',
                    sizeClasses[size]
                  )}
                  initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                  animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                  exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                  transition={{
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  {/* Header */}
                  {(title || description || showCloseButton) && (
                    <div className="flex items-start justify-between p-6 border-b border-gray-200">
                      <div className="flex-1">
                        {title && (
                          <Dialog.Title className="text-lg font-semibold text-gray-900">
                            {title}
                          </Dialog.Title>
                        )}
                        {description && (
                          <Dialog.Description className="text-sm text-gray-600 mt-1">
                            {description}
                          </Dialog.Description>
                        )}
                      </div>

                      {showCloseButton && (
                        <Dialog.Close
                          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100"
                          aria-label="Close"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </Dialog.Close>
                      )}
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-6">{children}</div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    );
  }
);

Modal.displayName = 'Modal';

/**
 * Modal Footer - For action buttons
 */
export interface ModalFooterProps {
  children: React.ReactNode;
  /** Align buttons */
  align?: 'start' | 'center' | 'end' | 'between';
  className?: string;
}

export const ModalFooter = ({ children, align = 'end', className }: ModalFooterProps) => {
  const alignClass = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  }[align];

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg',
        alignClass,
        className
      )}
    >
      {children}
    </div>
  );
};

ModalFooter.displayName = 'ModalFooter';

/**
 * Confirmation Modal - Quick confirm/cancel pattern
 */
export interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export const ConfirmModal = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  loading = false,
}: ConfirmModalProps) => {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
    >
      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={() => onOpenChange(false)}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className={cn(
            'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            confirmVariant === 'danger'
              ? 'bg-error hover:bg-error-dark'
              : 'bg-primary-600 hover:bg-primary-700'
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading...
            </span>
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </Modal>
  );
};

ConfirmModal.displayName = 'ConfirmModal';
