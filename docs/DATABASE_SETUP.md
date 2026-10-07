# Database Setup Guide

## Automatic Migrations

This project now automatically runs database migrations! 🎉

### How It Works

Migrations are automatically applied when you run:

```bash
npm install
```

The `postinstall` script runs `npm run db:migrate` which executes all SQL files in `supabase/migrations/` in order.

### Manual Migration

If you need to run migrations manually:

```bash
npm run db:migrate
```

### Adding New Migrations

1. Create a new SQL file in `supabase/migrations/` with a timestamp prefix:
   ```
   20241007000000_your_migration_name.sql
   ```

2. Write your SQL migration

3. Run migrations:
   ```bash
   npm run db:migrate
   ```

### Migration Files

Current migrations (run in this order):
- `20240101000000_initial_schema.sql` - Creates all tables (users, posts, categories, tags, media)
- `20240101000001_rls_policies.sql` - Sets up Row Level Security policies
- `20240101000002_auth_trigger.sql` - Auto-creates user profile on signup

### Troubleshooting

#### "relation does not exist" errors
Run the migrations:
```bash
npm run db:migrate
```

#### Connection errors
Check your `.env` file has the correct `DATABASE_URL`:
```
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@HOST:PORT/postgres
```

Get the connection string from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database

#### Want to reset the database?
⚠️ **This will delete all data!**

Go to Supabase Dashboard → SQL Editor and run:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Then run migrations again:
```bash
npm run db:migrate
```

## No Supabase CLI Login Required

This setup uses a custom Node.js migration script that:
- ✅ Reads migrations from `supabase/migrations/`
- ✅ Connects using your `DATABASE_URL`
- ✅ Runs all migrations in order
- ✅ Works in CI/CD environments
- ✅ No interactive authentication needed
- ✅ Idempotent (safe to run multiple times)

## Environment Variables

Required in `.env`:
```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```
