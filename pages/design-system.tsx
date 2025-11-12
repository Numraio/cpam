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
          <h3 className="text-lg font-semibold text-gray-700 mb-4">KPI Cards</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Total Items"
              value="1,234"
              change={{ value: '+12.3%', trend: 'up' }}
              icon={<CubeIcon className="h-12 w-12" />}
            />
            <KPICard
              label="Active PAMs"
              value="42"
              change={{ value: '+5.2%', trend: 'up' }}
              icon={<CalculatorIcon className="h-12 w-12" />}
            />
            <KPICard
              label="Calculations"
              value="8,291"
              change={{ value: '-2.1%', trend: 'down' }}
              icon={<ChartBarIcon className="h-12 w-12" />}
            />
            <KPICard
              label="Team Members"
              value="15"
              change={{ value: '0%', trend: 'neutral' }}
              icon={<UserGroupIcon className="h-12 w-12" />}
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
