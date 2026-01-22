# Settings Page

> **Source**: `web/src/pages/Settings.jsx`

User preferences and system settings.

## Overview

The Settings page provides:
- Theme selection (dark/light)
- Language preference
- Password change
- MFA setup/disable
- System settings (admin)

## Role Access

| Role | Access |
|------|--------|
| Admin | Full access including system settings |
| Manager | User preferences only |
| User | User preferences only |

## API Calls

| Endpoint | Purpose |
|----------|---------|
| GET /api/settings | Get all settings |
| PUT /api/settings/:key | Update setting |
| GET /api/settings/user/preferences | User preferences |
| PUT /api/settings/user/preferences | Update preferences |
| POST /api/auth/change-password | Change password |
| POST /api/auth/mfa/setup | Start MFA setup |
| POST /api/auth/mfa/verify-setup | Complete MFA setup |
| POST /api/auth/mfa/disable | Disable MFA |

## Sections

### Appearance

- Theme toggle (Dark/Light)
- Language selection (English, Spanish, French)

### Security

- Change password form
- MFA enable/disable toggle
- MFA setup wizard (QR code scan)
- Trusted devices list

### Notifications (User preferences)

- Email notifications toggle
- In-app notifications toggle

### System Settings (Admin only)

- Company name
- Default timezone
- Session timeout
- MFA requirement policy

## Theme Switching

```jsx
const handleThemeChange = (theme) => {
  localStorage.setItem('preferences_theme', theme);
  // Apply theme to document
  if (theme === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }
};
```

## MFA Setup Flow

1. Click "Enable MFA"
2. System generates TOTP secret
3. QR code displayed
4. User scans with authenticator app
5. User enters verification code
6. MFA enabled on success

## Password Change

Form fields:
- Current password
- New password
- Confirm new password

Validation:
- Current password required
- New password min 8 chars
- Passwords must match

## Language Selection

Available languages:
- English (en)
- Spanish (es)
- French (fr)

Uses i18next for translations.

## State

```jsx
const [theme, setTheme] = useState('dark');
const [language, setLanguage] = useState('en');
const [mfaEnabled, setMfaEnabled] = useState(false);
const [showMfaSetup, setShowMfaSetup] = useState(false);
const [showPasswordChange, setShowPasswordChange] = useState(false);
```

## Related

- [Settings API](../../backend/routes/settings.md)
- [Authentication API](../../backend/routes/auth-mfa.md)

---

*Last verified: January 2026*
