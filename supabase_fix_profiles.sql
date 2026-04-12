-- ============================================================
-- Fix: Ensure the `profiles` table has all required columns
-- Run this in your Supabase Dashboard → SQL Editor
-- ============================================================

-- Create the profiles table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.profiles (
  id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name  text NOT NULL DEFAULT '',
  role  text NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
  phone text NOT NULL DEFAULT ''
);

-- Add columns in case the table already exists but is missing them
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name  text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role  text NOT NULL DEFAULT 'patient';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Enable Row Level Security (required for Supabase)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY IF NOT EXISTS "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to insert their own profile (on signup)
CREATE POLICY IF NOT EXISTS "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY IF NOT EXISTS "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
