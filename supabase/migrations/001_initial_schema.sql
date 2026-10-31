-- CodeSense AI - Initial Schema Migration
-- Database: Supabase PostgreSQL with Row Level Security (RLS)

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    voice_enabled BOOLEAN NOT NULL DEFAULT true,
    voice_language TEXT NOT NULL DEFAULT 'en-US',
    speech_rate REAL NOT NULL DEFAULT 1.0,
    speech_volume REAL NOT NULL DEFAULT 1.0,
    alert_cooldown INTEGER NOT NULL DEFAULT 3000,
    enabled_languages JSONB NOT NULL DEFAULT '["java","python","cpp","javascript","c"]'::jsonb,
    analysis_mode TEXT NOT NULL DEFAULT 'hybrid', -- 'static' | 'ai' | 'hybrid'
    save_history BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- 3. DIAGNOSTIC HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.diagnostic_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    language TEXT NOT NULL,
    problem_title TEXT,
    error_type TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    confidence REAL NOT NULL,
    error_message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.diagnostic_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diagnostics"
    ON public.diagnostic_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostics"
    ON public.diagnostic_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own diagnostics"
    ON public.diagnostic_history FOR DELETE
    USING (auth.uid() = user_id);

-- 4. USAGE LOGS TABLE
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    analysis_type TEXT NOT NULL, -- 'static' | 'ai' | 'hybrid'
    language TEXT NOT NULL,
    processing_time_ms INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs"
    ON public.usage_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs"
    ON public.usage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_history_user_id ON public.diagnostic_history(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_history_created_at ON public.diagnostic_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
