# Design Guidelines for Knockturn Employee Timestrap

## Design Approach

**Reference-Based Approach**: Drawing inspiration from modern SaaS enterprise tools (Linear, Asana, Notion) combined with futuristic UI elements. This is a utility-focused, data-intensive application requiring clean hierarchy, professional polish, and sophisticated interactions.

## Core Design Principles

**Visual Identity**: Professional futuristic enterprise aesthetic with black and blue gradient theme as specified. Emphasis on data clarity, efficient workflows, and premium polish suitable for daily professional use.

**Key Design Pillars**:
- Clean data presentation with strong visual hierarchy
- Smooth, purposeful animations that enhance UX without distraction
- Professional enterprise credibility with modern edge
- Efficient interaction patterns for daily task logging

## Typography

**Font Family**: 
- Primary: 'Inter' (Google Fonts) - for UI, data, forms
- Accent: 'Space Grotesk' (Google Fonts) - for headings, hero text

**Type Scale**:
- Hero/Welcome: text-5xl to text-6xl, font-bold (Space Grotesk)
- Page Headings: text-3xl, font-semibold (Space Grotesk)
- Section Headers: text-xl, font-semibold (Inter)
- Body/Forms: text-base, font-normal (Inter)
- Labels: text-sm, font-medium (Inter)
- Captions/Metadata: text-xs (Inter)

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-4, p-6, p-8
- Section spacing: mb-8, mb-12, mb-16
- Element gaps: gap-4, gap-6, gap-8
- Page containers: max-w-7xl with px-6

**Grid Systems**:
- Dashboard/Analytics: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Data tables: Full-width responsive tables with horizontal scroll on mobile
- Forms: Single column on mobile, 2-column on desktop (grid-cols-1 lg:grid-cols-2)

## Component Library

### Welcome/Landing Page
- Full-viewport animated welcome screen (h-screen)
- Centered lamp pull graphic with GSAP animation
- Company logo at top (h-12 to h-16)
- Welcome text: "Welcome to Time Strap" in large futuristic typography
- Lamp pull interaction triggers smooth transition to login

### Login/Signup Card
- Centered card (max-w-md) with 3D rotating animation (GSAP rotateY)
- Glassmorphic effect: backdrop-blur-lg with subtle border
- Two-sided card: Login (front) / Signup (back)
- Input fields: Full-width with subtle glow on focus
- Buttons: Full-width primary button with gradient background
- Toggle link: "Don't have an account? Sign up" triggers card flip
- Forgot password link: Subtle, right-aligned under password field

### Navigation & Header
- Fixed top header (h-16) with logo left, user info center-right, logout right
- Role badge next to username (small pill with role color indicator)
- Page navigation (for admin/manager): Horizontal tabs or sidebar for multi-page access
- Calendar selector: Prominent date picker in header for tracker page

### Tracker Page Layout
- Header with date selector and shift dropdown (4/8/12 hours)
- Metrics bar: Current total time, remaining time, shift target (cards in grid)
- Task table: Sortable columns with sticky header
- Add task section: Inline expandable form or prominent "+ Add Task" button
- Analytics panel: Right sidebar or bottom section with collapsible charts

### Task Table/Cards
- Clean table rows with alternating subtle background (hover state)
- Columns: Project | Title | Description | Tools | Start | End | Duration | % | Actions
- Inline editing: Row expands to show editable fields
- Action buttons: Icon buttons (Edit, Save, Complete, Delete) with tooltips
- Recording button: Toggle button with visual timer indicator
- Time inputs: Custom time pickers with IST label
- Tools: Multi-select dropdown with checkboxes, search functionality

### Forms & Inputs
- Consistent input styling: border with focus glow effect
- Label above input (text-sm font-medium)
- Validation errors: Red text below field with icon
- Success states: Green checkmark with message
- Required fields: Asterisk indicator
- Dropdowns: Custom styled with smooth open/close animation

### Approval Page (Manager/HR)
- Pending submissions grid: Cards showing employee, date, total hours, task summary
- Each card: Employee name/code, submission date, hours breakdown
- Action buttons: Approve (green), Reject (red), View Details
- Bulk actions: "Select All" checkbox, "Approve All" / "Reject All" buttons at top
- Rejection modal: Textarea for reason, character counter, submit/cancel buttons
- Filters: By date range, employee, department

### Organisation Page
- Department cards in grid layout
- Tree view hierarchy: Collapsible nodes with animated expansion
- Create/Edit modals: Clean forms with department/group fields
- Employee assignment: Drag-and-drop or multi-select interface
- Visual indicators: Member count badges, status pills

### User Creation Page (Admin)
- Centered form (max-w-2xl) with clear sections
- Form fields in 2-column grid on desktop
- Role selector: Radio buttons or segmented control
- Department/Group: Cascading dropdowns
- Success message: Modal overlay with confirmation

### Admin Dashboard
- Stats cards grid: Employee count, active timesheets, pending approvals
- Audit log table: Chronological list with filters
- System settings: Toggle switches for features
- Management sections: Tabbed interface for employees/departments/settings

### Charts & Analytics (Chart.js)
- Doughnut chart: Work vs Break vs Tools (max-w-xs centered)
- Bar chart: Daily task breakdown (responsive width)
- Line chart: Productivity trends over time
- Tools usage pie: Multi-color segments with legend
- Card containers: Elevated cards (shadow-lg) with chart padding (p-6)

### Modals & Overlays
- Backdrop: Dark overlay (bg-black/50) with backdrop-blur
- Modal container: Centered, max-w-lg to max-w-2xl depending on content
- Close button: Top-right X icon
- Actions: Right-aligned button group (Cancel/Confirm pattern)

### Buttons
- Primary: Gradient background (blue theme), text-white, px-6 py-2.5, rounded-lg
- Secondary: Border with transparent background, hover fill
- Danger: Red background for delete/reject actions
- Icon buttons: Square aspect ratio (w-10 h-10), rounded-md
- Loading states: Spinner overlay on button text

### Notifications & Toasts
- Top-right toast notifications (slide-in animation)
- Success: Green accent with checkmark icon
- Error: Red accent with alert icon
- Info: Blue accent with info icon
- Auto-dismiss after 4-5 seconds

### Data Display
- Tables: Hover row highlighting, sortable headers with arrows
- Empty states: Centered illustration with message and CTA
- Loading states: Skeleton loaders matching component shape
- Pagination: Compact controls at table bottom
- Badges: Small rounded pills for status, role, counts

## Animations

**GSAP Animations** (Strategic Use):
- Welcome page: Lamp pull interaction (smooth drag, glow effect, fade transition)
- Login card: 3D flip rotation between login/signup (rotateY 180deg)
- Page transitions: Subtle fade-in on route change
- Task recording: Pulsing indicator during active recording
- Form submissions: Success checkmark animation

**CSS Transitions** (Subtle):
- Hover states: 200ms ease for buttons, cards
- Input focus: Border glow transition (300ms)
- Dropdown open/close: Transform scale (200ms)
- Modal entrance: Fade + scale (300ms cubic-bezier)

Avoid: Excessive parallax, continuous animations, bouncing effects in enterprise context

## Images

**Logo**: Company logo (Knockturn Private Limited) in header - height h-10 to h-12, maintain aspect ratio

**Welcome Page Background**: Optional subtle animated gradient background or geometric pattern overlay to enhance futuristic feel without distracting from lamp pull interaction

**No Hero Images**: This is a functional enterprise tool - focus on clean UI, data visualization, and efficient workflows rather than marketing imagery

## Accessibility

- ARIA labels for all interactive elements
- Keyboard navigation: Tab order, Enter/Space for actions, Esc for modals
- Focus indicators: Visible outline on keyboard navigation
- Color contrast: WCAG AA compliant text/background ratios
- Screen reader announcements for dynamic content updates (task saves, validations)
- Form validation: Clear error messages with icons and accessible labeling

---

This design creates a professional, futuristic enterprise time tracking system with the requested black and blue gradient theme, sophisticated animations, and comprehensive role-based functionality while maintaining data clarity and efficient workflows.