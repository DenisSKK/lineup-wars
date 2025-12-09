# Setup Guide for Lineup Wars

This guide will walk you through setting up the Lineup Wars application from scratch.

## Prerequisites

Before you begin, make sure you have:

- Node.js 18 or higher installed
- npm or yarn package manager
- A Supabase account (free tier is sufficient)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/DenisSKK/lineup-wars.git
cd lineup-wars

# Install dependencies
npm install
```

## Step 2: Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in or create an account
2. Click "New Project"
3. Fill in the project details:
   - Name: `lineup-wars`
   - Database Password: Choose a strong password
   - Region: Select the closest region to your users
4. Click "Create new project" and wait for it to finish setting up

## Step 3: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Project Settings** (gear icon in the sidebar)
2. Click on **API** in the left menu
3. You'll see two important values:
   - **Project URL**: This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key**: This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 4: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in your text editor and fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 5: Set Up the Database

1. In your Supabase dashboard, click on the **SQL Editor** in the sidebar
2. Click **New Query**
3. Open the file `supabase/schema.sql` from this repository
4. Copy all the SQL code from that file
5. Paste it into the SQL Editor in Supabase
6. Click **Run** (or press Ctrl+Enter)

This will create all the necessary tables, indexes, policies, triggers, and functions.

### Verify Database Setup

After running the schema, you should see these tables in the **Table Editor**:
- profiles
- festivals
- bands
- lineups
- band_ratings
- groups
- group_members
- user_festivals

## Step 6: Add Sample Data (Optional but Recommended)

To test the application with some data:

1. In the Supabase SQL Editor, create another new query
2. Open the file `supabase/sample-data.sql` from this repository
3. Copy and paste the SQL code
4. Click **Run**

This will add:
- 2 sample festivals (Rock For People 2024, Nova Rock 2024)
- 12 sample bands (Metallica, Foo Fighters, Green Day, etc.)
- Lineup entries connecting bands to festivals

## Step 7: Run the Application

```bash
# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 8: Create Your First User

1. Click "Sign Up" on the home page
2. Enter your email and password
3. Fill in your full name
4. Click "Sign Up"

**Note**: By default, Supabase requires email confirmation. For development, you can disable this:
1. Go to **Authentication** > **Providers** in Supabase
2. Click on **Email**
3. Disable "Confirm email"

## Step 9: Test the Features

Now you can:

1. **Browse Festivals**: Go to the Festivals page to see the sample festivals
2. **Rate Bands**: Click on a festival to see its lineup and rate bands (1-10)
3. **Create a Group**: Go to Groups and create a new group
4. **View Rankings**: In your group, see which festival has better ratings based on your scores

## Troubleshooting

### Build Errors

If you get environment variable errors during build:
```bash
# Make sure your .env file exists and has the correct values
cat .env

# The variables should start with NEXT_PUBLIC_
```

### Database Connection Issues

If the app can't connect to Supabase:
1. Verify your environment variables are correct
2. Check that your Supabase project is running (green status in dashboard)
3. Make sure you're using the correct region URL

### Authentication Issues

If login/signup doesn't work:
1. Check the Supabase logs: **Authentication** > **Users** in the dashboard
2. Verify Row Level Security (RLS) policies are enabled
3. Make sure email confirmation is disabled for development

### No Data Showing

If festivals or bands don't appear:
1. Verify the sample data was inserted successfully
2. Check the **Table Editor** in Supabase to see if data exists
3. Check browser console for any errors

## Production Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project"
4. Import your GitHub repository
5. Add your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click "Deploy"

### Environment Variables in Production

Make sure to add the same environment variables to your production environment. In Vercel:
1. Go to Project Settings
2. Click "Environment Variables"
3. Add each variable with the same name and value from your `.env` file

## Next Steps

- Add more festivals and bands through the Supabase dashboard
- Invite friends to create accounts and join your groups
- Customize the styling in `app/globals.css`
- Add more features like comments, festival images, or band details

## Support

If you encounter any issues:
1. Check the [Next.js documentation](https://nextjs.org/docs)
2. Check the [Supabase documentation](https://supabase.com/docs)
3. Open an issue on GitHub

Happy festival rating! 🎸🎵
