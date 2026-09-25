# LogiSphere AI Backend

Express + TypeScript backend for the existing React Native LogiSphere AI app.

## Run

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The server listens on `http://localhost:5000` by default.

## Supabase

Run `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor, then optionally run `supabase/seed.sql`.

Set these in `.env`:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
```

When Supabase variables are omitted, the backend uses seeded in-memory data for local development and tests.

## Frontend Base URL

The current frontend has a mix of devtunnel and localhost constants in `App/src/api/apiPath.ts`. Point those constants to this backend host, keeping the `/api/...` paths unchanged.
