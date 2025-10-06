# Authentication System

## Single Admin User

The HR system uses a **simplified single-user authentication** approach. There is one admin account that provides access to the entire system.

## Login Credentials

**⚠️ UPDATED FOR SECURITY (MLGA)**

```
Username: Avneet
Password: mHwK3G0D1fA6gZUPthjBOQL8YPBN
```

**Note:** The weak password "password123" has been replaced with a strong password as part of the MLGA (Make Login Great Again) security enhancement.

## How It Works

1. **Single User**: The system has one user account in the database
2. **Simple Login**: Username/password authentication (no complex security features)
3. **Session-based**: Uses sessions that last 8 hours
4. **No Registration**: No user registration or management needed

## Database Schema

The `users` table is simple:
- `id` - User ID
- `email` - Email address
- `full_name` - Display name (used as username)
- `password_hash` - Bcrypt hashed password
- `role` - User role (always 'Admin')

## Setting Up the Admin User

If you can't log in, run this script to create/reset the admin user:

```bash
# Set your database URL
export DATABASE_URL="postgresql://hr:hrpass@localhost:5432/hrcore"

# Run the setup script
cd scripts
node setup-admin-user.js
```

This will:
1. Delete any existing users
2. Create a fresh admin user with credentials: **Avneet** / **password123**

## API Endpoints

### POST `/api/auth/login`
Authenticate and create a session

**Request:**
```json
{
  "username": "Avneet",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "Avneet",
    "email": "admin@hrsystem.com",
    "role": "Admin"
  },
  "sessionId": "..."
}
```

### POST `/api/auth/logout`
End the current session

### GET `/api/auth/session`
Check if the current session is valid

## Session Management

- Sessions last **8 hours**
- Sessions are stored in the `user_sessions` table
- Session ID is stored in an HTTP-only cookie
- Sessions automatically extend with activity

## Changing the Password

To change the admin password, you need to:

1. Generate a new bcrypt hash:
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('your-new-password', 12);
console.log(hash);
```

2. Update the database:
```sql
UPDATE users 
SET password_hash = 'your-new-hash-here'
WHERE email = 'admin@hrsystem.com';
```

3. Or update `db/init/010_simple_auth.sql` and restart the database

## Troubleshooting

### Can't Log In?

1. **Run the setup script:**
   ```bash
   cd scripts && node setup-admin-user.js
   ```

2. **Check if database is running:**
   ```bash
   docker ps | grep postgres
   ```

3. **Check the user exists:**
   ```sql
   SELECT * FROM users;
   ```

4. **Restart the API server:**
   ```bash
   docker restart hr-api-1
   ```

### "Invalid credentials" error

- Make sure you're using **Avneet** (not avneet or AVNEET)
- Password is **password123** (case-sensitive)
- Try running the setup script again

### Session expired immediately

- Check that the `user_sessions` table exists
- Clear your browser cookies
- Try in an incognito/private window

## Security Notes

⚠️ **This is a simplified authentication system for internal HR use**

- Password is hardcoded (for simplicity)
- No rate limiting on failed attempts
- No account lockout
- No password complexity requirements
- No multi-factor authentication

**For production use**, consider:
- Changing the default password
- Implementing proper password policies
- Adding rate limiting
- Using HTTPS
- Regular security audits

---

**Last Updated:** October 2, 2025

