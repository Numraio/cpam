import type { NextPageWithLayout } from '@/types';
import { AccountLayout } from '@/components/layouts';
import { useState } from 'react';
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  KPICard,
  Modal,
  ModalFooter,
  ConfirmModal,
  Select,
  SearchableSelect,
  Switch,
  SwitchGroup,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  Tooltip,
} from '@/components/ui';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  ChartBarIcon,
  CubeIcon,
  CalculatorIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { LineChart, BarChart, AreaChart, PieChart } from '@/components/ui/charts';

/**
 * Design System Showcase
 *
 * This page demonstrates all the new UI components from the design system.
 * Use this as a reference for component usage and styling.
 */
const DesignSystemPage: NextPageWithLayout = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');

  // Select states
  const [country, setCountry] = useState('');
  const [searchableCountry, setSearchableCountry] = useState('');

  // Switch states
  const [notifications, setNotifications] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Dropdown states
  const [showBookmarks, setShowBookmarks] = useState(true);
  const [showUrls, setShowUrls] = useState(false);
  const [person, setPerson] = useState('pedro');

  const countryOptions = [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
    { value: 'au', label: 'Australia' },
    { value: 'de', label: 'Germany' },
    { value: 'fr', label: 'France' },
    { value: 'jp', label: 'Japan' },
    { value: 'cn', label: 'China' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-12">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Design System</h1>
        <p className="text-lg text-gray-600">
          Modern UI components with animations and micro-interactions
        </p>
      </div>

      {/* Buttons Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Buttons</h2>

        <div className="space-y-6">
          {/* Button Variants */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Variants</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="danger">Danger Button</Button>
              <Button variant="success">Success Button</Button>
              <Button variant="link">Link Button</Button>
            </div>
          </div>

          {/* Button Sizes */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Sizes</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small Button</Button>
              <Button size="md">Medium Button</Button>
              <Button size="lg">Large Button</Button>
            </div>
          </div>

          {/* Button States */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">States</h3>
            <div className="flex flex-wrap gap-3">
              <Button loading>Loading Button</Button>
              <Button disabled>Disabled Button</Button>
              <Button leftIcon={<PlusIcon className="h-4 w-4" />}>
                With Left Icon
              </Button>
              <Button rightIcon={<TrashIcon className="h-4 w-4" />} variant="danger">
                Delete
              </Button>
            </div>
          </div>

          {/* Icon Buttons */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Icon Buttons</h3>
            <div className="flex flex-wrap gap-3">
              <IconButton
                icon={<PlusIcon className="h-5 w-5" />}
                ariaLabel="Add"
                variant="primary"
              />
              <IconButton
                icon={<PencilIcon className="h-5 w-5" />}
                ariaLabel="Edit"
                variant="secondary"
              />
              <IconButton
                icon={<TrashIcon className="h-5 w-5" />}
                ariaLabel="Delete"
                variant="danger"
              />
              <IconButton
                icon={<CheckIcon className="h-5 w-5" />}
                ariaLabel="Confirm"
                variant="success"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Inputs Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Inputs</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Default Input */}
          <Input
            id="email-demo"
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            helperText="We'll never share your email"
          />

          {/* Error State */}
          <Input
            id="password-demo"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error="Password must be at least 8 characters"
          />

          {/* Success State */}
          <Input
            id="username-demo"
            label="Username"
            defaultValue="john_doe"
            success="Username is available!"
          />

          {/* Required Field */}
          <Input
            id="required-demo"
            label="Required Field"
            required
            helperText="This field is required"
          />

          {/* Textarea */}
          <div className="md:col-span-2">
            <Textarea
              id="description-demo"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              helperText="Describe your project in detail"
            />
          </div>
        </div>
      </section>

      {/* Cards Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Cards</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Basic Card */}
          <Card variant="elevated">
            <CardHeader
              title="Basic Card"
              description="A simple card with elevation"
            />
            <CardBody>
              <p className="text-gray-600">
                This is a basic card with default styling and shadow elevation.
              </p>
            </CardBody>
            <CardFooter align="end">
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
              <Button variant="primary" size="sm">
                Save
              </Button>
            </CardFooter>
          </Card>

          {/* Interactive Card */}
          <Card
            variant="outlined"
            interactive
            onClick={() => alert('Card clicked!')}
          >
            <CardHeader
              title="Interactive Card"
              description="Click me for interaction"
            />
            <CardBody>
              <p className="text-gray-600">
                This card has hover and click effects with smooth animations.
              </p>
            </CardBody>
          </Card>

          {/* Card with Action */}
          <Card>
            <CardHeader
              title="Card with Action"
              description="Header with action button"
              action={
                <IconButton
                  icon={<PencilIcon className="h-4 w-4" />}
                  ariaLabel="Edit"
                  size="sm"
                />
              }
            />
            <CardBody>
              <p className="text-gray-600">
                This card has an action button in the header for quick access.
              </p>
            </CardBody>
          </Card>
        </div>

        {/* KPI Cards */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">KPI Cards - Modern Design</h3>
          <p className="text-sm text-gray-600 mb-4">Enhanced with sparklines, better typography, and hover states (Stripe/Figma-inspired)</p>

          {/* With Sparklines */}
          <h4 className="text-sm font-semibold text-gray-600 mb-3">With Sparklines & Variants</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              title="Total Revenue"
              value="$1,234,567"
              change={12.3}
              changeLabel="vs last month"
              trend="up"
              icon={<ChartBarIcon className="h-5 w-5" />}
              variant="primary"
              sparkline={[400, 420, 380, 450, 470, 490, 520, 540, 580, 600, 620, 650]}
            />
            <KPICard
              title="Active Users"
              value="42,891"
              change={5.2}
              changeLabel="vs last week"
              trend="up"
              icon={<UserGroupIcon className="h-5 w-5" />}
              variant="success"
              sparkline={[320, 330, 310, 340, 360, 380, 400, 420, 450, 470, 490, 510]}
            />
            <KPICard
              title="Calculations"
              value="8,291"
              change={-2.1}
              changeLabel="vs last month"
              trend="down"
              icon={<CalculatorIcon className="h-5 w-5" />}
              variant="warning"
              sparkline={[500, 490, 480, 470, 460, 450, 440, 430, 420, 410, 400, 390]}
            />
            <KPICard
              title="Error Rate"
              value="0.23%"
              change={0}
              changeLabel="stable"
              trend="neutral"
              icon={<CubeIcon className="h-5 w-5" />}
              variant="error"
              sparkline={[50, 51, 50, 49, 50, 51, 50, 50, 49, 50, 51, 50]}
            />
          </div>

          {/* Without Sparklines */}
          <h4 className="text-sm font-semibold text-gray-600 mb-3">Standard KPI Cards</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Items"
              value="1,234"
              subtitle="Formula graphs"
              icon={<CubeIcon className="h-5 w-5" />}
            />
            <KPICard
              title="Active PAMs"
              value="42"
              change={5.2}
              trend="up"
              icon={<CalculatorIcon className="h-5 w-5" />}
              variant="primary"
            />
            <KPICard
              title="Pending Approvals"
              value="15"
              subtitle="Awaiting review"
              icon={<ChartBarIcon className="h-5 w-5" />}
              variant="warning"
            />
            <KPICard
              title="Team Members"
              value="8"
              changeLabel="2 pending invites"
              icon={<UserGroupIcon className="h-5 w-5" />}
            />
          </div>
        </div>
      </section>

      {/* Modals Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Modals</h2>

        <div className="flex flex-wrap gap-4">
          <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Open Confirm Modal
          </Button>
        </div>

        {/* Basic Modal */}
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="Example Modal"
          description="This is a modal dialog with animations"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              This modal demonstrates the enter/exit animations, backdrop overlay,
              and keyboard handling (press ESC to close).
            </p>

            <Input
              id="modal-input"
              label="Name"
              helperText="Enter your name"
            />

            <Textarea
              id="modal-textarea"
              label="Message"
              helperText="Enter your message"
              rows={3}
            />
          </div>

          <ModalFooter align="end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Save Changes
            </Button>
          </ModalFooter>
        </Modal>

        {/* Confirm Modal */}
        <ConfirmModal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete Item"
          description="Are you sure you want to delete this item? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          confirmVariant="danger"
          onConfirm={async () => {
            // Simulate async operation
            await new Promise((resolve) => setTimeout(resolve, 1000));
            alert('Item deleted!');
          }}
        />
      </section>

      {/* Select Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Select</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Select */}
          <Select
            id="country"
            label="Country"
            placeholder="Select a country"
            value={country}
            onValueChange={setCountry}
            options={countryOptions}
            helperText="Choose your country of residence"
          />

          {/* Searchable Select */}
          <SearchableSelect
            id="searchable-country"
            label="Searchable Select"
            placeholder="Search for a country"
            value={searchableCountry}
            onValueChange={setSearchableCountry}
            options={countryOptions}
            searchPlaceholder="Type to search..."
            helperText="Start typing to filter options"
          />

          {/* Required Select */}
          <Select
            id="required-select"
            label="Required Field"
            placeholder="Select an option"
            options={countryOptions}
            required
            helperText="This field is required"
          />

          {/* Error State */}
          <Select
            id="error-select"
            label="With Error"
            placeholder="Select an option"
            options={countryOptions}
            error="Please select a valid option"
          />
        </div>
      </section>

      {/* Switch Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Switches</h2>

        <div className="space-y-6">
          {/* Individual Switches */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Individual</h3>
            <div className="space-y-4">
              <Switch
                id="notifications-switch"
                checked={notifications}
                onCheckedChange={setNotifications}
                label="Enable Notifications"
                description="Receive email notifications for important updates"
              />
              <Switch
                id="marketing-switch"
                checked={marketing}
                onCheckedChange={setMarketing}
                label="Marketing Emails"
                description="Receive promotional offers and product news"
              />
            </div>
          </div>

          {/* Switch Sizes */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Sizes</h3>
            <div className="flex items-center gap-6">
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
                size="sm"
                label="Small"
              />
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
                size="md"
                label="Medium"
              />
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
                size="lg"
                label="Large"
              />
            </div>
          </div>

          {/* Switch Group */}
          <SwitchGroup
            label="Display Settings"
            description="Customize your viewing experience"
          >
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={setDarkMode}
              label="Dark Mode"
              description="Use dark theme across the application"
            />
            <Switch
              id="compact-view"
              checked={false}
              onCheckedChange={() => {}}
              label="Compact View"
              description="Show more items with reduced spacing"
            />
          </SwitchGroup>
        </div>
      </section>

      {/* Dropdown Menu Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dropdown Menus</h2>

        <div className="flex flex-wrap gap-4">
          {/* Basic Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">Basic Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Profile
                <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                Settings
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                Billing
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-error">
                Log out
                <DropdownMenuShortcut>⌘Q</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Checkboxes Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">With Checkboxes</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>View Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={showBookmarks}
                onCheckedChange={setShowBookmarks}
              >
                Show Bookmarks
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showUrls}
                onCheckedChange={setShowUrls}
              >
                Show Full URLs
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Radio Group Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">Radio Group</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Assign to</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={person} onValueChange={setPerson}>
                <DropdownMenuRadioItem value="pedro">Pedro Duarte</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="colm">Colm Tuite</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      {/* Tooltip Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Tooltips</h2>

        <div className="flex flex-wrap gap-6">
          <Tooltip content="This is a tooltip" side="top">
            <Button>Hover me (Top)</Button>
          </Tooltip>

          <Tooltip content="Tooltip on the right" side="right">
            <Button variant="secondary">Hover me (Right)</Button>
          </Tooltip>

          <Tooltip content="Tooltip on the bottom" side="bottom">
            <Button variant="ghost">Hover me (Bottom)</Button>
          </Tooltip>

          <Tooltip content="Tooltip on the left" side="left">
            <Button variant="success">Hover me (Left)</Button>
          </Tooltip>

          <Tooltip content="Delete this item permanently">
            <IconButton
              icon={<TrashIcon className="h-5 w-5" />}
              ariaLabel="Delete"
              variant="danger"
            />
          </Tooltip>

          <Tooltip content="Edit settings" delayDuration={500}>
            <IconButton
              icon={<PencilIcon className="h-5 w-5" />}
              ariaLabel="Edit"
              variant="secondary"
            />
          </Tooltip>
        </div>
      </section>

      {/* Charts Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Charts & Data Visualization</h2>
        <p className="text-sm text-gray-600 mb-6">
          Modern chart components with enhanced tooltips, gradients, and interactions inspired by Stripe, Figma, and Google Analytics.
          Features cleaner grids, better spacing, smooth animations, and refined color palettes.
        </p>

        <div className="space-y-8">
          {/* Line Chart */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Line Chart</h3>
            <p className="text-sm text-gray-600 mb-4">
              Clean lines, no dots by default, enhanced hover states, custom tooltips with color indicators
            </p>
            <Card variant="elevated">
              <CardBody>
                <LineChart
                  data={[
                    { month: 'Jan', revenue: 4000, costs: 2400 },
                    { month: 'Feb', revenue: 3000, costs: 1398 },
                    { month: 'Mar', revenue: 2000, costs: 9800 },
                    { month: 'Apr', revenue: 2780, costs: 3908 },
                    { month: 'May', revenue: 1890, costs: 4800 },
                    { month: 'Jun', revenue: 2390, costs: 3800 },
                  ]}
                  lines={[
                    { dataKey: 'revenue', name: 'Revenue' },
                    { dataKey: 'costs', name: 'Costs', color: 'hsl(var(--warning))' },
                  ]}
                  xAxisKey="month"
                  height={300}
                />
              </CardBody>
            </Card>
          </div>

          {/* Bar Chart */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Bar Chart</h3>
            <p className="text-sm text-gray-600 mb-4">
              Rounded corners, better spacing, optimized bar widths, subtle hover cursor
            </p>
            <Card variant="elevated">
              <CardBody>
                <BarChart
                  data={[
                    { category: 'Product A', sales: 4000, profit: 2400 },
                    { category: 'Product B', sales: 3000, profit: 1398 },
                    { category: 'Product C', sales: 2000, profit: 9800 },
                    { category: 'Product D', sales: 2780, profit: 3908 },
                    { category: 'Product E', sales: 1890, profit: 4800 },
                  ]}
                  bars={[
                    { dataKey: 'sales', name: 'Sales' },
                    { dataKey: 'profit', name: 'Profit', color: 'hsl(var(--success))' },
                  ]}
                  xAxisKey="category"
                  height={300}
                />
              </CardBody>
            </Card>
          </div>

          {/* Area Chart */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Area Chart</h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Stripe-style gradients:</strong> Smooth linear gradients from 30% opacity to 5%, creating elegant fills
            </p>
            <Card variant="elevated">
              <CardBody>
                <AreaChart
                  data={[
                    { date: '2024-01', desktop: 186, mobile: 80 },
                    { date: '2024-02', desktop: 305, mobile: 200 },
                    { date: '2024-03', desktop: 237, mobile: 120 },
                    { date: '2024-04', desktop: 73, mobile: 190 },
                    { date: '2024-05', desktop: 209, mobile: 130 },
                    { date: '2024-06', desktop: 214, mobile: 140 },
                  ]}
                  areas={[
                    { dataKey: 'desktop', name: 'Desktop' },
                    { dataKey: 'mobile', name: 'Mobile', color: 'hsl(var(--success))' },
                  ]}
                  xAxisKey="date"
                  height={300}
                  stacked
                />
              </CardBody>
            </Card>
          </div>

          {/* Pie Chart */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Pie Chart</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enhanced tooltips with percentage calculations, white stroke borders, hover opacity effects (Figma-inspired)
            </p>
            <Card variant="elevated">
              <CardBody>
                <PieChart
                  data={[
                    { name: 'Chrome', value: 400 },
                    { name: 'Safari', value: 300 },
                    { name: 'Firefox', value: 200 },
                    { name: 'Edge', value: 100 },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  height={350}
                />
              </CardBody>
            </Card>
          </div>

          {/* Donut Chart */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Donut Chart</h3>
            <p className="text-sm text-gray-600 mb-4">
              Modern donut chart with increased padding angle for better visual separation
            </p>
            <Card variant="elevated">
              <CardBody>
                <PieChart
                  data={[
                    { name: 'Q1', value: 2400 },
                    { name: 'Q2', value: 4567 },
                    { name: 'Q3', value: 1398 },
                    { name: 'Q4', value: 9800 },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  height={350}
                  innerRadius={60}
                />
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* Animations Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Animations & Micro-interactions</h2>

        <div className="space-y-8">
          {/* Fade Animations */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Fade Animations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card variant="elevated" className="animate-fade-in">
                <CardBody>
                  <p className="text-gray-700 font-medium">Fade In</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Smooth fade-in effect using <code className="text-xs bg-gray-100 px-1 rounded">animate-fade-in</code>
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Slide Animations */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Slide Animations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="elevated" className="animate-slide-in-from-top">
                <CardBody>
                  <p className="text-gray-700 font-medium text-sm">Slide from Top</p>
                  <p className="text-xs text-gray-500 mt-1">animate-slide-in-from-top</p>
                </CardBody>
              </Card>
              <Card variant="elevated" className="animate-slide-in-from-bottom">
                <CardBody>
                  <p className="text-gray-700 font-medium text-sm">Slide from Bottom</p>
                  <p className="text-xs text-gray-500 mt-1">animate-slide-in-from-bottom</p>
                </CardBody>
              </Card>
              <Card variant="elevated" className="animate-slide-in-from-left">
                <CardBody>
                  <p className="text-gray-700 font-medium text-sm">Slide from Left</p>
                  <p className="text-xs text-gray-500 mt-1">animate-slide-in-from-left</p>
                </CardBody>
              </Card>
              <Card variant="elevated" className="animate-slide-in-from-right">
                <CardBody>
                  <p className="text-gray-700 font-medium text-sm">Slide from Right</p>
                  <p className="text-xs text-gray-500 mt-1">animate-slide-in-from-right</p>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Scale Animations */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Scale & Bounce Animations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="elevated" className="animate-scale-in">
                <CardBody>
                  <p className="text-gray-700 font-medium">Scale In</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Scales from 95% to 100% with <code className="text-xs bg-gray-100 px-1 rounded">animate-scale-in</code>
                  </p>
                </CardBody>
              </Card>
              <Card variant="elevated" className="animate-bounce-in">
                <CardBody>
                  <p className="text-gray-700 font-medium">Bounce In</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Playful bounce effect with <code className="text-xs bg-gray-100 px-1 rounded">animate-bounce-in</code>
                  </p>
                </CardBody>
              </Card>
              <Card variant="elevated">
                <CardBody>
                  <p className="text-gray-700 font-medium">Hover Scale</p>
                  <div className="mt-2 p-4 bg-primary-100 rounded hover:scale-105 transition-transform duration-200 cursor-pointer">
                    <p className="text-sm text-primary-700">Hover me!</p>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Loading States */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Loading & Continuous Animations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="elevated">
                <CardBody>
                  <p className="text-gray-700 font-medium mb-3">Pulse Soft</p>
                  <div className="h-4 w-full bg-primary-200 rounded animate-pulse-soft" />
                </CardBody>
              </Card>
              <Card variant="elevated">
                <CardBody>
                  <p className="text-gray-700 font-medium mb-3">Shimmer</p>
                  <div
                    className="h-4 w-full rounded animate-shimmer"
                    style={{
                      backgroundImage: 'linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
                      backgroundSize: '1000px 100%',
                    }}
                  />
                </CardBody>
              </Card>
              <Card variant="elevated">
                <CardBody>
                  <p className="text-gray-700 font-medium mb-3">Spin Slow</p>
                  <div className="flex justify-center">
                    <div className="h-8 w-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin-slow" />
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Hover Effects */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Hover & Interactive Effects</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card variant="outlined" className="hover:shadow-lg transition-shadow duration-normal cursor-pointer">
                <CardBody>
                  <p className="text-sm font-medium text-gray-700">Shadow on Hover</p>
                  <p className="text-xs text-gray-500 mt-1">hover:shadow-lg</p>
                </CardBody>
              </Card>
              <Card variant="outlined" className="hover:bg-gray-50 transition-colors duration-normal cursor-pointer">
                <CardBody>
                  <p className="text-sm font-medium text-gray-700">Background Change</p>
                  <p className="text-xs text-gray-500 mt-1">hover:bg-gray-50</p>
                </CardBody>
              </Card>
              <Card variant="outlined" className="hover:border-primary-500 transition-colors duration-normal cursor-pointer">
                <CardBody>
                  <p className="text-sm font-medium text-gray-700">Border Color</p>
                  <p className="text-xs text-gray-500 mt-1">hover:border-primary</p>
                </CardBody>
              </Card>
              <Card variant="outlined" className="hover:-translate-y-1 transition-transform duration-normal cursor-pointer">
                <CardBody>
                  <p className="text-sm font-medium text-gray-700">Lift Up</p>
                  <p className="text-xs text-gray-500 mt-1">hover:-translate-y-1</p>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Staggered Animations Example */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Staggered List Animations</h3>
            <Card variant="elevated">
              <CardBody>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((item, index) => (
                    <div
                      key={item}
                      className="p-3 bg-gray-50 rounded-md animate-slide-in-from-left"
                      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                    >
                      <p className="text-sm font-medium text-gray-700">List Item {item}</p>
                      <p className="text-xs text-gray-500">Staggered by {index * 100}ms</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* Design Tokens */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Design Tokens</h2>

        {/* Colors */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Colors</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="h-16 rounded-lg bg-primary-500 shadow-sm mb-2" />
              <p className="text-sm font-medium">Primary</p>
            </div>
            <div>
              <div className="h-16 rounded-lg bg-success shadow-sm mb-2" />
              <p className="text-sm font-medium">Success</p>
            </div>
            <div>
              <div className="h-16 rounded-lg bg-warning shadow-sm mb-2" />
              <p className="text-sm font-medium">Warning</p>
            </div>
            <div>
              <div className="h-16 rounded-lg bg-error shadow-sm mb-2" />
              <p className="text-sm font-medium">Error</p>
            </div>
            <div>
              <div className="h-16 rounded-lg bg-gray-500 shadow-sm mb-2" />
              <p className="text-sm font-medium">Gray</p>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Typography</h3>
          <div className="space-y-2">
            <p className="text-4xl font-bold">Heading 1 - 36px Bold</p>
            <p className="text-3xl font-bold">Heading 2 - 30px Bold</p>
            <p className="text-2xl font-bold">Heading 3 - 24px Bold</p>
            <p className="text-xl font-semibold">Heading 4 - 20px Semibold</p>
            <p className="text-lg font-medium">Heading 5 - 18px Medium</p>
            <p className="text-base">Body - 16px Regular</p>
            <p className="text-sm">Small - 14px Regular</p>
            <p className="text-xs">Extra Small - 12px Regular</p>
          </div>
        </div>

        {/* Shadows */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Shadows</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="h-16 rounded-lg bg-white shadow-sm flex items-center justify-center">
              <span className="text-sm">Small</span>
            </div>
            <div className="h-16 rounded-lg bg-white shadow flex items-center justify-center">
              <span className="text-sm">Default</span>
            </div>
            <div className="h-16 rounded-lg bg-white shadow-md flex items-center justify-center">
              <span className="text-sm">Medium</span>
            </div>
            <div className="h-16 rounded-lg bg-white shadow-lg flex items-center justify-center">
              <span className="text-sm">Large</span>
            </div>
            <div className="h-16 rounded-lg bg-white shadow-xl flex items-center justify-center">
              <span className="text-sm">Extra Large</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

DesignSystemPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default DesignSystemPage;
