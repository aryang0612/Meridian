# Fix Supabase Keys

## Current Issue
Your app is using a "publishable" key (starts with `sb_publishable_`) but it needs the "anon" key (starts with `eyJ`).

## How to Fix

1. **Go to your Supabase project dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `mycqipaelreacgasdejg`

2. **Get the correct keys:**
   - Go to **Settings** → **API**
   - Copy the **anon/public** key (starts with `eyJ...`)
   - Copy the **URL** (you already have this)

3. **Update your `.env.local` file:**
   ```bash
   # Replace the current NEXT_PUBLIC_SUPABASE_ANON_KEY with:
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_actual_anon_key_here...
   ```

4. **Restart your dev server:**
   ```bash
   pkill -f "next dev"
   npm run dev
   ```

## What This Will Fix
- ✅ Remove the "Supabase anon key may be invalid" warning
- ✅ Fix authentication issues
- ✅ Enable database operations
- ✅ Remove "No user ID provided" errors
- ✅ Fix "invalid input syntax for type uuid" errors

## Current Keys (WRONG)
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_-srLSf2r0B8JmByIbkPSvg_CMcgF9BO...
```

## Correct Keys (RIGHT)
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
``` 