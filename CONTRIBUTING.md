# Contributing to Lineup Wars

Thank you for your interest in contributing to Lineup Wars! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/lineup-wars.git`
3. Follow the [SETUP.md](SETUP.md) guide to set up your development environment
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Running Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build
```

### Code Style

- We use ESLint for code linting
- Run `npm run lint` before committing
- Follow the existing code style in the project
- Use TypeScript for all new code
- Use meaningful variable and function names

### Database Changes

If you need to modify the database schema:

1. Update `supabase/schema.sql` with your changes
2. Document the changes in your pull request
3. If adding new tables, remember to:
   - Add appropriate indexes
   - Enable Row Level Security (RLS)
   - Create appropriate RLS policies
   - Add TypeScript types in `lib/types/database.ts`

## Pull Request Process

1. Ensure your code passes all linting checks: `npm run lint`
2. Ensure your code builds successfully: `npm run build`
3. Update documentation if you've made changes to:
   - Database schema
   - Environment variables
   - Setup process
   - User-facing features
4. Write a clear PR description explaining:
   - What changes you made
   - Why you made them
   - How to test them
5. Link any related issues

## Feature Requests

Have an idea for a new feature? We'd love to hear it!

1. Check existing issues to see if it's already been suggested
2. Open a new issue with the label "enhancement"
3. Clearly describe:
   - The feature you'd like to see
   - Why it would be useful
   - How it might work

## Bug Reports

Found a bug? Help us fix it!

1. Check if the bug has already been reported
2. Open a new issue with the label "bug"
3. Include:
   - A clear title and description
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots if applicable
   - Your environment (OS, browser, Node version)

## Coding Guidelines

### TypeScript

- Always define proper types, avoid `any` when possible
- Use interfaces for object shapes
- Export types that might be reused

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use meaningful prop names

### Naming Conventions

- Components: PascalCase (`BandRating.tsx`)
- Files: camelCase or kebab-case
- Variables and functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Database tables: snake_case

### File Organization

```
app/                    # Next.js pages
components/            # Reusable React components
lib/
  ├── supabase/       # Supabase client configuration
  └── types/          # TypeScript type definitions
supabase/             # Database schema and migrations
```

## Security

- Never commit sensitive data (API keys, passwords)
- Use environment variables for configuration
- Follow Supabase Row Level Security best practices
- Validate user input on both client and server

## Testing

Currently, this project doesn't have automated tests, but we welcome contributions to add them! Consider:

- Unit tests for utility functions
- Integration tests for database operations
- E2E tests for critical user flows

## Questions?

Feel free to open an issue with the label "question" if you need help or clarification.

## Code of Conduct

Be respectful and considerate to other contributors. We want to maintain a welcoming and inclusive community.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

Thank you for contributing to Lineup Wars! 🎸
