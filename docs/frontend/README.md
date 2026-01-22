# Frontend Documentation

> **Source**: `web/src/`

The frontend is a React single-page application built with Vite, using Tailwind CSS for styling and Framer Motion for animations.

## Quick Reference

| What | Where |
|------|-------|
| Main app & routing | `web/src/App.jsx` |
| Page components | `web/src/pages/` |
| Shared components | `web/src/components/` |
| Custom hooks | `web/src/hooks/` |
| Utilities | `web/src/utils/` |
| API client | `web/src/config/api.js` |
| Styles | `web/src/index.css`, `tailwind.config.js` |
| i18n | `web/src/i18n/` |

## Application Structure

```jsx
// App.jsx structure
<App>
  {!user && <Login onLogin={handleLogin} />}
  {user && (
    <>
      <Header />           {/* Top bar with user info, logout */}
      <Sidebar />          {/* Navigation menu */}
      <Main>
        <CurrentPage />    {/* Active page component */}
      </Main>
    </>
  )}
</App>
```

## Navigation & Pages

Pages are defined in `App.jsx` via `getPagesConfig()`:

| Page Key | Component | Path | Description | Doc |
|----------|-----------|------|-------------|-----|
| dashboard | Dashboard.jsx | / | Main dashboard | [dashboard.md](./pages/dashboard.md) |
| employees | Employees.jsx | /employees | Employee list & profiles | [employees.md](./pages/employees.md) |
| timeTracking | TimeTracking.jsx | /time-tracking | Timecard management | [time-tracking.md](./pages/time-tracking.md) |
| leave | LeaveManagement.jsx | /leave | Leave requests & balances | [leave-management.md](./pages/leave-management.md) |
| payroll | Payroll.jsx | /payroll | Legacy payroll view | [payroll.md](./pages/payroll.md) |
| compliance | Compliance.jsx | /compliance | Compliance alerts | [compliance.md](./pages/compliance.md) |
| bonuses | BonusesCommissions.jsx | /bonuses | Bonuses & commissions | [bonuses-commissions.md](./pages/bonuses-commissions.md) |
| messages | Messages.jsx | /messages | Chat/messaging | [messages.md](./pages/messages.md) |
| testing | Testing.jsx | /testing | Test/debug page | [testing.md](./pages/testing.md) |
| settings | Settings.jsx | /settings | User settings | [settings.md](./pages/settings.md) |

Hidden pages (not in nav):
- `Login.jsx` - Login form
- `EmployeeProfile.jsx` - Individual employee view
- `PayrollV2.jsx` - New payroll system

## Role-Based Access

Navigation is filtered by user role using `useUserRole` hook:

```jsx
// From hooks/useUserRole.js
export function canAccessPage(userRole, salesRole, pageKey) {
  // Admin/Manager: access all pages
  // User: limited to own data pages
  // Sales roles: access bonuses/commissions
}
```

| Role | Accessible Pages |
|------|------------------|
| Admin | All pages |
| Manager | All pages |
| User | Dashboard, Time Tracking, Leave, Settings |

## Shared Components

### Core UI Components

| Component | Purpose | Doc |
|-----------|---------|-----|
| Button.tsx | Button variants | [button.md](./components/button.md) |
| Card.tsx | Card container | [card.md](./components/card.md) |
| Modal.tsx | Modal dialogs | [modal.md](./components/modal.md) |
| Table.tsx | Data tables | [table.md](./components/table.md) |
| Toast.tsx | Toast notifications | [toast.md](./components/toast.md) |
| FormInput.tsx | Form inputs | [form-input.md](./components/form-input.md) |
| FormSelect.tsx | Select dropdowns | [form-select.md](./components/form-select.md) |
| DatePicker.jsx | Date selection | [date-picker.md](./components/date-picker.md) |
| DateRangePicker.jsx | Date range selection | [date-range-picker.md](./components/date-range-picker.md) |

### Layout & Navigation

| Component | Purpose |
|-----------|---------|
| Login.jsx | Login form with MFA |
| NotificationCenter.jsx | Notification dropdown |
| ErrorBoundary.tsx | Error boundary wrapper |
| LoadingSpinner.tsx | Loading indicator |
| SkeletonLoader.tsx | Loading skeleton |

### Feature Components

| Component | Purpose |
|-----------|---------|
| EmployeeOnboarding.jsx | New employee wizard |
| EmployeeOffboarding.jsx | Termination wizard |
| LeaveRequestForm.jsx | Submit leave request |
| LeaveRequestApproval.jsx | Approve/reject leave |
| MyLeaveRequests.jsx | View own requests |
| TimecardUploadViewer.jsx | Excel upload UI |
| Chat/* | Chat UI components |

## Custom Hooks

| Hook | Purpose | Doc |
|------|---------|-----|
| useUserRole.js | Get current user role, check permissions | [use-user-role.md](./hooks/use-user-role.md) |
| useForm.ts | Form state management | [use-form.md](./hooks/use-form.md) |
| useWebSocket.js | WebSocket connection | [use-websocket.md](./hooks/use-websocket.md) |
| usePerformance.js | Performance monitoring | [use-performance.md](./hooks/use-performance.md) |

## Utilities

| Utility | Purpose | Doc |
|---------|---------|-----|
| apiClient.ts | HTTP client for API calls | [api-client.md](./utils/api-client.md) |
| sessionManager.js | Session state management | [session-manager.md](./utils/session-manager.md) |
| sessionFix.js | Session recovery utilities | [session-fix.md](./utils/session-fix.md) |
| validation.ts | Form validation rules | [validation.md](./utils/validation.md) |
| timezone.js | Timezone utilities | [timezone.md](./utils/timezone.md) |
| payrollPeriods.js | Pay period calculations | [payroll-periods.md](./utils/payroll-periods.md) |
| errorHandler.ts | Error handling utilities | [error-handler.md](./utils/error-handler.md) |

## API Communication

All API calls go through the `API` function from `config/api.js`:

```javascript
import { API } from '../config/api.js';

// GET request
const employees = await API('/api/employees');

// POST request
await API('/api/leave-requests', {
  method: 'POST',
  body: JSON.stringify({ ... })
});
```

Features:
- Automatic credentials (cookies)
- JSON content-type headers
- Error handling
- Session validation

## State Management

- **No global state library** - uses React state and context
- **Session state** - managed by `sessionManager.js`
- **User state** - held in `App.jsx`, passed via props
- **Page state** - local to each page component

## Styling

### Tailwind CSS

Custom "Tahoe" theme (macOS-style):

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'tahoe-bg': '#0B0B0C',
        'tahoe-panel': 'rgba(22, 22, 24, 0.8)',
        'tahoe-accent': '#0A84FF',
        // ...
      }
    }
  }
}
```

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `tahoe-bg` | `#0B0B0C` | Page background |
| `tahoe-panel` | `rgba(22,22,24,0.8)` | Card/panel background |
| `tahoe-accent` | `#0A84FF` | Primary buttons, links |
| `tahoe-border` | `rgba(255,255,255,0.12)` | Borders |

### Animation

Using Framer Motion:

```jsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
>
  Content
</motion.div>
```

## Internationalization (i18n)

Supported locales: `en`, `es`, `fr`

```javascript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
<span>{t('nav.dashboard')}</span>
```

Translation files in `web/src/i18n/locales/`.

## Testing

```bash
cd web
npm test           # Run tests
npm run test:ui    # Test UI
npm run test:coverage  # Coverage report
```

Uses Vitest + Testing Library.

---

*Last verified: January 2026*
