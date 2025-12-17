# Database Migrations

This directory contains database migrations for Lineup Wars using Supabase.

## Structure

Migrations are stored in the `supabase/migrations/` directory with the naming convention:
```
YYYYMMDDHHMMSS_description.sql
```

For example:
- `20241210000000_initial_schema.sql`
- `20241210120000_add_user_preferences.sql`

## Creating New Migrations

### Using npm script (Recommended)
```bash
npm run db:migration:new
```
This will prompt you for a migration name and create a timestamped file.

### Manual creation
Create a new SQL file in `supabase/migrations/` with the timestamp format:
```bash
touch supabase/migrations/$(date -u +%Y%m%d%H%M%S)_your_migration_name.sql
```

## Migration Best Practices

1. **One change per migration**: Keep migrations focused on a single logical change
2. **Use IF NOT EXISTS**: For idempotency, use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc.
3. **Add comments**: Document what the migration does and why
4. **Test locally first**: Always test migrations on your local Supabase instance before production
5. **Never modify existing migrations**: Once applied to production, create a new migration to make changes

## Applying Migrations

### With Supabase CLI (Recommended)

**Note**: Supabase CLI is installed as a local dev dependency in this project.

1. **Link to your project**:
```bash
npm run db:link -- --project-ref your-project-ref
```

2. **Apply migrations**:
```bash
npm run db:push
```

3. **Reset database** (development only):
```bash
npm run db:reset
```

You can also run any Supabase CLI command with:
```bash
npm run supabase -- <command>
```

### Manual Application

You can also apply migrations manually through the Supabase dashboard:
1. Go to the SQL Editor in your Supabase dashboard
2. Copy the contents of your migration file
3. Execute the SQL

## Migration Examples

### Adding a new table
```sql
-- Add notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
```

### Adding a column
```sql
-- Add bio column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;
```

### Creating an index
```sql
-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_bands_genre ON bands(genre);
```

## Useful Scripts

- `npm run db:migration:new` - Create a new migration file
- `npm run db:migration:list` - List all migrations
- `npm run db:link` - Link to your Supabase project
- `npm run db:push` - Apply all migrations to the database
- `npm run db:reset` - Reset database (development only)
- `npm run supabase -- <command>` - Run any Supabase CLI command

## Current Schema

The initial schema includes:
- **profiles**: User profiles linked to Supabase auth
- **festivals**: Festival information
- **bands**: Band information
- **lineups**: Festival lineups (bands performing at festivals)
- **band_ratings**: User ratings for bands (universal ratings, not festival-specific)
- **groups**: User groups for collaborative rating
- **group_members**: Group membership tracking
- **user_festivals**: User's selected festivals

All tables include:
- Row Level Security (RLS) policies
- Proper indexes for performance
- Timestamps (created_at, updated_at)
- Foreign key constraints

## Troubleshooting

### Migration fails with "relation already exists"
- Ensure you're using `IF NOT EXISTS` clauses
- Check if the migration was already applied

### Permission errors
- Verify your Supabase credentials are correct
- Ensure you have the necessary permissions on the project

### Syntax errors
- Test your SQL in the Supabase SQL Editor first
- Check for missing semicolons or incorrect syntax
