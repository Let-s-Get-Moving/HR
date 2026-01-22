# MFA Service

> **Source**: `api/src/services/mfa.js`

Multi-Factor Authentication using TOTP.

## Exports

| Function | Purpose |
|----------|---------|
| `generateSecret` | Generate new TOTP secret |
| `generateQRCode` | Create QR code for authenticator |
| `verifyToken` | Verify TOTP code |
| `enableMFA` | Enable MFA for user |
| `disableMFA` | Disable MFA for user |

## generateSecret(username)

Generate a new TOTP secret:

```javascript
const { secret, otpauth_url } = generateSecret('user@example.com');
// secret: 'BASE32SECRETKEY'
// otpauth_url: 'otpauth://totp/HR:user@example.com?secret=...'
```

## generateQRCode(otpauth_url)

Generate QR code image:

```javascript
const qrDataUrl = await generateQRCode(otpauth_url);
// qrDataUrl: 'data:image/png;base64,...'
```

## verifyToken(secret, token)

Verify a TOTP token:

```javascript
const isValid = verifyToken(secret, '123456');
// isValid: true | false
```

Token window: ±1 (30 seconds before/after).

## enableMFA(userId, secret)

Enable MFA for a user:

```javascript
await enableMFA(userId, secret);
// Updates users.mfa_enabled = true
// Updates users.mfa_secret = secret
```

## disableMFA(userId)

Disable MFA for a user:

```javascript
await disableMFA(userId);
// Updates users.mfa_enabled = false
// Clears users.mfa_secret
```

## Dependencies

- `speakeasy` - TOTP generation/verification
- `qrcode` - QR code generation

## Related

- [Authentication API](../routes/auth-mfa.md)
- [Authentication Documentation](../../security/authentication.md)

---

*Last verified: January 2026*
