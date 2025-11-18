# CPAM Design System

Modern, accessible design system built with TypeScript, Tailwind CSS, and Framer Motion.

**Design Inspiration:** Material Design 3, Linear, Stripe, Figma

---

## 🎨 Design Principles

1. **Consistency**: Unified spacing, typography, and color system
2. **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation
3. **Performance**: Optimized animations (duration-200) and lazy loading
4. **Responsive**: Mobile-first design with breakpoints
5. **Dark Mode**: Full dark mode support across all components

---

## 📐 Design Tokens

### Spacing System (8px grid)
```css
p-1  = 4px   | gap-1  = 4px
p-2  = 8px   | gap-2  = 8px
p-3  = 12px  | gap-3  = 12px
p-4  = 16px  | gap-4  = 16px
p-5  = 20px  | gap-5  = 20px
p-6  = 24px  | gap-6  = 24px
p-8  = 32px  | gap-8  = 32px
```

### Typography
```css
text-xs    = 12px / line-height: 16px
text-sm    = 14px / line-height: 20px
text-base  = 16px / line-height: 24px
text-lg    = 18px / line-height: 28px
text-xl    = 20px / line-height: 28px
text-2xl   = 24px / line-height: 32px
text-3xl   = 30px / line-height: 36px
```

### Font Weights
```css
font-normal    = 400
font-medium    = 500
font-semibold  = 600
font-bold      = 700
```

### Border Radius
```css
rounded-md  = 6px
rounded-lg  = 8px
rounded-xl  = 12px
rounded-2xl = 16px
rounded-full = 9999px
```

### Shadows
```css
shadow-sm  = subtle elevation
shadow-md  = standard elevation
shadow-lg  = prominent elevation
shadow-xl  = modal/drawer elevation
shadow-2xl = maximum elevation
```

### Transitions
```css
duration-200  = 200ms  (default for most interactions)
duration-300  = 300ms  (collapsible elements)
duration-500  = 500ms  (page transitions)

transition-all       = all properties
transition-colors    = color properties
transition-transform = transform properties
```

---

## 🎨 Color System

### Primary (Brand)
```css
primary-50   = #f0f9ff  (lightest background)
primary-100  = #e0f2fe  (hover backgrounds)
primary-600  = #0284c7  (primary actions, links)
primary-700  = #0369a1  (active states)
```

### Neutral (Grays)
```css
gray-50   = #f9fafb  (page backgrounds)
gray-100  = #f3f4f6  (hover backgrounds)
gray-200  = #e5e7eb  (borders)
gray-300  = #d1d5db  (disabled text)
gray-400  = #9ca3af  (placeholder text)
gray-500  = #6b7280  (secondary text)
gray-600  = #4b5563  (body text)
gray-700  = #374151  (headings)
gray-800  = #1f2937  (dark backgrounds)
gray-900  = #111827  (darkest backgrounds)
```

### Success (Green)
```css
success-light = #86efac  (light mode)
success       = #22c55e  (primary green)
success-dark  = #16a34a  (dark mode)
```

### Warning (Yellow)
```css
warning-light = #fcd34d  (light mode)
warning       = #f59e0b  (primary yellow)
warning-dark  = #d97706  (dark mode)
```

### Error (Red)
```css
error-light = #fca5a5  (light mode)
error       = #ef4444  (primary red)
error-dark  = #dc2626  (dark mode)
```

---

## 🧩 Component Library

### Buttons

**Location:** `components/ui/Button.tsx`

**Variants:**
- `primary` - Primary actions (bg-primary-600, text-white)
- `secondary` - Secondary actions (bg-gray-100, text-gray-900)
- `ghost` - Tertiary actions (transparent, hover:bg-gray-100)
- `outline` - Outlined buttons (border, transparent bg)
- `danger` - Destructive actions (bg-error, text-white)
- `success` - Positive actions (bg-success, text-white)

**Sizes:**
- `xs` - Extra small (px-2.5 py-1.5, text-xs)
- `sm` - Small (px-3 py-2, text-sm)
- `md` - Medium (px-4 py-2.5, text-sm) - default
- `lg` - Large (px-5 py-3, text-base)
- `xl` - Extra large (px-6 py-3.5, text-base)

**Usage:**
```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary" size="md" leftIcon={<Icon />}>
  Click me
</Button>
```

---

### Input Fields

**Location:** `components/ui/Input.tsx`

**Variants:**
- `Input` - Standard text input
- `Textarea` - Multi-line text input

**Features:**
- Floating labels
- Error states
- Helper text
- Icons (left/right)
- Character counter
- Disabled states

**Usage:**
```tsx
import { Input } from '@/components/ui/Input';

<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error="Invalid email"
  required
/>
```

---

### Cards

**Location:** `components/ui/Card.tsx`

**Components:**
- `Card` - Container
- `CardHeader` - Header section
- `CardBody` - Main content
- `CardFooter` - Footer section
- `KPICard` - Metric display card

**Variants:**
- `default` - Standard card
- `elevated` - With shadow

**KPICard Props:**
```tsx
interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;           // Percentage change
  changeLabel?: string;      // "vs last month"
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  subtitle?: string;
  sparkline?: number[];      // Mini chart data
}
```

**Usage:**
```tsx
import { KPICard } from '@/components/ui/Card';

<KPICard
  title="Total Revenue"
  value="$45,231"
  change={12.5}
  changeLabel="vs last month"
  trend="up"
  variant="success"
  sparkline={[100, 120, 115, 134, 150, 148, 170]}
  icon={<DollarIcon className="h-5 w-5" />}
/>
```

---

### Modals

**Location:** `components/ui/Modal.tsx`

**Components:**
- `Modal` - Base modal
- `ModalFooter` - Footer with actions
- `ConfirmModal` - Confirmation dialog

**Features:**
- Backdrop click to close
- Escape key support
- Focus trap
- Scroll lock
- Framer Motion animations

**Usage:**
```tsx
import { Modal, ModalFooter } from '@/components/ui/Modal';

<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Confirm Action"
>
  <p>Are you sure?</p>
  <ModalFooter>
    <Button variant="ghost" onClick={onClose}>Cancel</Button>
    <Button variant="danger" onClick={onConfirm}>Delete</Button>
  </ModalFooter>
</Modal>
```

---

### Dropdown Menus

**Location:** `components/ui/DropdownMenu.tsx`

**Features:**
- Radix UI primitives
- Keyboard navigation
- Nested submenus
- Separators
- Checkboxes and radio items

**Usage:**
```tsx
import { DropdownMenu } from '@/components/ui/DropdownMenu';

<DropdownMenu
  trigger={<Button>Options</Button>}
  items={[
    { label: 'Edit', onSelect: handleEdit },
    { label: 'Delete', onSelect: handleDelete },
    { type: 'separator' },
    { label: 'Export', onSelect: handleExport },
  ]}
  align="end"
/>
```

---

### Select Components

**Location:** `components/ui/Select.tsx`

**Components:**
- `Select` - Standard dropdown select
- `SearchableSelect` - With search/filter

**Usage:**
```tsx
import { Select } from '@/components/ui/Select';

<Select
  label="Country"
  options={[
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
  ]}
  value={selected}
  onChange={setSelected}
/>
```

---

### Charts

**Location:** `components/ui/charts/`

**Available Charts:**
- `LineChart` - Trend visualization
- `AreaChart` - Area under curve
- `BarChart` - Comparison bars
- `PieChart` - Part-to-whole relationships

**Features:**
- Recharts library
- Custom tooltips (Stripe/Figma inspired)
- Gradient fills
- Smooth animations
- Responsive containers
- Dark mode support

**Common Props:**
```tsx
interface ChartProps {
  data: any[];
  height?: number;          // default: 300
  showGrid?: boolean;       // default: true
  showLegend?: boolean;     // default: true
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
  formatTooltip?: (value: any) => string;
  animate?: boolean;        // default: true
}
```

**Usage:**
```tsx
import { LineChart } from '@/components/ui/charts/LineChart';

<LineChart
  data={data}
  xAxisKey="date"
  lines={[
    { dataKey: 'revenue', name: 'Revenue', color: '#0284c7' },
    { dataKey: 'profit', name: 'Profit', color: '#22c55e' },
  ]}
  height={400}
  formatTooltip={(value) => `$${value.toLocaleString()}`}
/>
```

---

### Navigation

**Location:** `components/shared/shell/`

**Components:**
- `Drawer` - Sidebar with mobile drawer
- `Header` - Top navigation bar
- `Navigation` - Main navigation items
- `NavigationItems` - Collapsible menu items

**Features:**
- Framer Motion animations
- Keyboard support (Escape key)
- Body scroll lock (mobile)
- Active state indicators (border-l-4)
- Collapsible submenus
- LocalStorage state persistence

**Navigation Pattern:**
```tsx
const menus: MenuItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: ChartBarIcon,
    active: activePathname === '/dashboard',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
    active: activePathname?.startsWith('/settings'),
    items: [
      { name: 'Account', href: '/settings/account', active: ... },
      { name: 'Security', href: '/settings/security', active: ... },
    ],
  },
];
```

---

### Loading States

**Location:** `components/ui/loading/`

**Components:**
- `SkeletonTable` - Table loading state
- `SkeletonCard` - Card loading state
- `SkeletonKPICard` - KPI card loading state
- `SkeletonChart` - Chart loading state
- `SkeletonForm` - Form loading state
- `Shimmer` - Shimmer animation overlay

**Features:**
- Animated shimmer effect (2s duration)
- Matches component layouts
- Dark mode support
- Configurable rows/columns/count
- Accessibility-friendly with semantic HTML

**Usage:**
```tsx
import { SkeletonTable, SkeletonCard, SkeletonChart } from '@/components/ui/loading';

// Table skeleton
{isLoading ? (
  <SkeletonTable rows={10} columns={6} showActions />
) : (
  <DataTable data={data} />
)}

// KPI cards skeleton
{isLoading ? (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <SkeletonKPICard count={3} />
  </div>
) : (
  kpiData.map(kpi => <KPICard {...kpi} />)
)}

// Chart skeleton
{isLoading ? (
  <SkeletonChart type="line" height={400} showLegend />
) : (
  <LineChart data={chartData} />
)}
```

**Skeleton Components Reference:**

**SkeletonTable:**
```tsx
interface SkeletonTableProps {
  rows?: number;           // default: 5
  columns?: number;        // default: 5
  showHeader?: boolean;    // default: true
  showActions?: boolean;   // default: true
}
```

**SkeletonCard:**
```tsx
interface SkeletonCardProps {
  count?: number;          // default: 1
  height?: number;         // default: auto
  showHeader?: boolean;    // default: true
  showFooter?: boolean;    // default: false
}
```

**SkeletonChart:**
```tsx
interface SkeletonChartProps {
  height?: number;                            // default: 300
  type?: 'line' | 'bar' | 'area' | 'pie';   // default: 'line'
  showLegend?: boolean;                       // default: true
}
```

---

### Empty States

**Location:** `components/ui/empty-states/`

**Components:**
- `EmptyState` - Generic empty state
- `NoData` - First-time user (no entities created)
- `NoResults` - Search/filter returned no matches
- `ErrorState` - Failed to load data
- `NoAccess` - Permission denied

**Features:**
- Contextual messaging
- Call-to-action buttons
- Icon or illustration support
- Three size variants (sm, default, lg)
- Accessible and responsive

**Usage:**
```tsx
import { NoData, NoResults, ErrorState } from '@/components/ui/empty-states';

// No data (first-time user)
{pams.length === 0 && !isFiltered && (
  <NoData
    entityType="PAM"
    entityTypePlural="PAMs"
    onCreate={() => router.push('/pams/new')}
  />
)}

// No results (filtered/searched)
{pams.length === 0 && isFiltered && (
  <NoResults
    searchQuery={searchQuery}
    onClear={() => setSearchQuery('')}
  />
)}

// Error state
{error && (
  <ErrorState
    title="Failed to load PAMs"
    description={error.message}
    onRetry={() => refetch()}
  />
)}
```

**Empty State Components Reference:**

**EmptyState (Generic):**
```tsx
interface EmptyStateProps {
  icon?: ReactNode;                // Icon component
  title: string;                   // Main heading
  description?: string;            // Descriptive text
  action?: {                       // Primary CTA
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  secondaryAction?: {              // Secondary action
    label: string;
    onClick: () => void;
  };
  illustration?: string;           // Image path
  size?: 'sm' | 'default' | 'lg';  // default: 'default'
}
```

**NoData:**
```tsx
interface NoDataProps {
  entityType: string;              // e.g., "PAM"
  entityTypePlural?: string;       // e.g., "PAMs"
  onCreate?: () => void;           // Create action
  title?: string;                  // Custom title
  description?: string;            // Custom description
}
```

**NoResults:**
```tsx
interface NoResultsProps {
  searchQuery?: string;            // Search term
  onClear?: () => void;            // Clear filters action
  title?: string;                  // Custom title
  description?: string;            // Custom description
}
```

**ErrorState:**
```tsx
interface ErrorStateProps {
  title?: string;                  // default: "Something went wrong"
  description?: string;            // Error message
  onRetry?: () => void;            // Retry action
  onContact?: () => void;          // Contact support action
}
```

**NoAccess:**
```tsx
interface NoAccessProps {
  resourceType?: string;           // e.g., "team settings"
  title?: string;                  // Custom title
  description?: string;            // Custom description
  onRequestAccess?: () => void;    // Request access action
}
```

---

### Page Header

**Location:** `components/navigation/PageHeader.tsx`

**Features:**
- Sticky positioning
- Scroll-aware shadow
- Primary and secondary actions
- Status badges
- Responsive layout

**Usage:**
```tsx
import PageHeader from '@/components/navigation/PageHeader';

<PageHeader
  title="Page Title"
  subtitle="Description text"
  sticky
  statusBadge={<Badge>Active</Badge>}
  primaryAction={
    <Button variant="primary">Create</Button>
  }
  secondaryActions={
    <Button variant="ghost">Cancel</Button>
  }
/>
```

---

## 🎭 Animation Patterns

### Micro-interactions
```tsx
// Hover scale
className="hover:scale-110 transition-transform duration-200"

// Hover background
className="hover:bg-gray-100 transition-colors duration-200"

// Focus ring
className="focus:ring-2 focus:ring-primary-500 focus:outline-none"
```

### Page Transitions
```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.2 }}
>
  {content}
</motion.div>
```

### Drawer/Modal Animations
```tsx
// Slide in from left
<motion.div
  initial={{ x: -320 }}
  animate={{ x: 0 }}
  exit={{ x: -320 }}
  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
>
  {content}
</motion.div>

// Backdrop fade
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.3 }}
>
  {backdrop}
</motion.div>
```

---

## ♿ Accessibility Guidelines

### Keyboard Navigation
- All interactive elements focusable
- Visible focus indicators (ring-2)
- Logical tab order
- Escape key closes modals/drawers

### ARIA Attributes
```tsx
// Buttons
<button aria-label="Close menu" aria-pressed={isOpen}>

// Links
<Link href="/page" aria-current={isActive ? 'page' : undefined}>

// Modals
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">

// Navigation
<nav aria-label="Main navigation">

// Expandable sections
<button aria-expanded={isExpanded} aria-controls="submenu-id">
```

### Color Contrast
- Text: Minimum 4.5:1 ratio
- Large text: Minimum 3:1 ratio
- Interactive elements: Minimum 3:1 ratio

---

## 📱 Responsive Breakpoints

```css
sm:   640px   /* Small tablets */
md:   768px   /* Tablets */
lg:   1024px  /* Laptops */
xl:   1280px  /* Desktops */
2xl:  1536px  /* Large desktops */
```

**Mobile-first approach:**
```tsx
// Mobile by default, tablet and up
<div className="p-4 md:p-6 lg:p-8">

// Hidden on mobile, visible on desktop
<div className="hidden lg:block">

// Full width on mobile, fixed width on desktop
<div className="w-full lg:w-64">
```

---

## 🌙 Dark Mode

**Implementation:** Tailwind's `dark:` prefix

```tsx
// Text colors
<p className="text-gray-900 dark:text-gray-100">

// Backgrounds
<div className="bg-white dark:bg-gray-900">

// Borders
<div className="border-gray-200 dark:border-gray-800">

// Custom colors
<div className="bg-primary-50 dark:bg-primary-900/20">
```

---

## 📋 Component Checklist

When creating new components:

- [ ] TypeScript interfaces exported
- [ ] Dark mode styles (dark: prefix)
- [ ] Responsive design (mobile-first)
- [ ] Keyboard navigation support
- [ ] ARIA labels and roles
- [ ] Focus indicators (ring-2)
- [ ] Consistent spacing (8px grid)
- [ ] Standard transitions (duration-200)
- [ ] Icon sizes standardized (h-5 w-5)
- [ ] Error and loading states
- [ ] Props documentation

---

## 🔗 Related Files

- **Design System Template:** `pages/design-system.tsx`
- **Tailwind Config:** `tailwind.config.js`
- **Component Index:** `components/ui/index.ts`
- **Type Definitions:** `types/index.ts`

---

## 📚 References

- **Tailwind CSS:** https://tailwindcss.com
- **Framer Motion:** https://www.framer.com/motion
- **Radix UI:** https://www.radix-ui.com
- **Heroicons:** https://heroicons.com
- **Recharts:** https://recharts.org

---

**Last Updated:** 2025-11-18
**Version:** 1.0.0
