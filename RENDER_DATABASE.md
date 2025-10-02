# Render Database Connection

## Connection Details

### External URL (use from local machine)
```
postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4
```

### Internal URL (use from Render services)
```
postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a/hrcore_42l4
```

### psql Command Line
```bash
PGPASSWORD=bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn psql -h dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com -U hr hrcore_42l4
```

## Database Info
- **Host**: dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com
- **Database**: hrcore_42l4
- **Username**: hr
- **Password**: bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn
- **Region**: Oregon

## Login Credentials

```
Username: Avneet
Password: password123
```

## Running Scripts Against Render Database

Always set the DATABASE_URL environment variable before running any scripts:

```bash
export DATABASE_URL="postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4"
```

### Setup Admin User
```bash
cd scripts
export DATABASE_URL="postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4"
node setup-admin-user.js
```

### Clean All Data
```bash
cd scripts
export DATABASE_URL="postgresql://hr:bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn@dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com/hrcore_42l4"
node remove-all-mock-data.js
```

## Important Notes

⚠️ **This is the PRODUCTION database**
- All changes affect the live system
- Always backup before running destructive operations
- The database is hosted on Render's Oregon region
- SSL is required for connections (automatically handled by scripts)

## Render Dashboard

Access your database at: https://dashboard.render.com/

---

**Last Updated**: October 2, 2025

