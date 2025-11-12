/**
 * UI Component Library
 *
 * Modern, accessible component library built with:
 * - Radix UI primitives
 * - Framer Motion animations
 * - Class Variance Authority for variants
 * - Tailwind CSS for styling
 *
 * Design inspired by Material Design 3, Linear, and Figma.
 */

export { Button, IconButton, type ButtonProps } from './Button';
export { Input, Textarea, type InputProps, type TextareaProps } from './Input';
export {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  KPICard,
  type CardProps,
  type CardHeaderProps,
  type CardFooterProps,
  type KPICardProps,
} from './Card';
export {
  Modal,
  ModalFooter,
  ConfirmModal,
  type ModalProps,
  type ModalFooterProps,
  type ConfirmModalProps,
} from './Modal';
export {
  Select,
  SearchableSelect,
  type SelectProps,
  type SelectOption,
  type SearchableSelectProps,
} from './Select';
export { Switch, SwitchGroup, type SwitchProps, type SwitchGroupProps } from './Switch';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './DropdownMenu';
export {
  Tooltip,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  type TooltipProps,
} from './Tooltip';
