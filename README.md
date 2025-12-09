# Lineup Wars 🎸

Website to decide which festival is better. In development for Rock For People vs. Nova Rock festivals.

## Features

- 🔐 **Authentication**: User signup and login with Supabase Auth
- 🎵 **Festival Management**: Browse and select festivals to rate
- ⭐ **Band Ratings**: Rate individual bands from festival lineups (1-10 scale)
- 👥 **Groups**: Create groups with friends to compare ratings
- 📊 **Combined Rankings**: See which festival wins based on aggregated group ratings

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase project (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/DenisSKK/lineup-wars.git
cd lineup-wars
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your project URL and anon key

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Set up the database

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/schema.sql`
4. Run the SQL to create all tables, policies, and triggers

### 6. Add sample data (optional)

To test the application, add some sample festivals and bands:

```sql
-- Insert sample festivals
INSERT INTO festivals (name, year, location, description) VALUES
  ('Rock For People', 2024, 'Hradec Králové, Czech Republic', 'One of the largest music festivals in Central Europe'),
  ('Nova Rock', 2024, 'Nickelsdorf, Austria', 'Austria''s biggest rock and metal festival');

-- Insert sample bands
INSERT INTO bands (name, genre, country) VALUES
  ('Metallica', 'Heavy Metal', 'USA'),
  ('Foo Fighters', 'Rock', 'USA'),
  ('Green Day', 'Punk Rock', 'USA'),
  ('The Offspring', 'Punk Rock', 'USA');

-- Get the festival and band IDs
-- Then create lineups linking bands to festivals
INSERT INTO lineups (festival_id, band_id, day_number, stage) VALUES
  ('festival_id_1', 'band_id_1', 1, 'Main Stage'),
  ('festival_id_1', 'band_id_2', 2, 'Main Stage');
```

### 7. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
lineup-wars/
├── app/                      # Next.js App Router pages
│   ├── festivals/           # Festival browsing and rating
│   ├── groups/              # Group management
│   ├── login/               # Login page
│   ├── signup/              # Signup page
│   └── page.tsx             # Home page
├── components/              # React components
│   ├── BandRating.tsx      # Band rating component
│   └── CreateGroupForm.tsx # Group creation form
├── lib/
│   ├── supabase/           # Supabase client configuration
│   └── types/              # TypeScript type definitions
├── supabase/
│   └── schema.sql          # Database schema
└── middleware.ts            # Auth middleware

```

## Database Schema

The application uses the following main entities:

- **profiles**: User profiles (linked to Supabase auth.users)
- **festivals**: Music festivals with name, year, location
- **bands**: Bands with genre, country, description
- **lineups**: Links bands to festivals
- **band_ratings**: User ratings for bands at specific festivals
- **groups**: User-created groups for comparing ratings
- **group_members**: Group membership
- **user_festivals**: Tracks which festivals users have selected

## Usage

1. **Sign up** or **log in** to your account
2. **Browse festivals** and select ones you want to rate
3. **Rate bands** individually from each festival's lineup (1-10)
4. **Create a group** and invite friends (they need to join using the group ID)
5. **View combined rankings** in the group to see which festival wins

## Development

### Build the project

```bash
npm run build
```

### Run linting

```bash
npm run lint
```

## Deployment

The application is ready to deploy on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add your environment variables
4. Deploy!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.
