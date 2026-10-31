-- CodeSense AI - Add Voice Personality and Profanity Settings Migration

ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS voice_personality TEXT NOT NULL DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS profanity_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_voice_templates JSONB DEFAULT '{}'::jsonb;

-- Constraint check on personality
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_voice_personality'
    ) THEN 
        ALTER TABLE public.user_settings 
        ADD CONSTRAINT check_voice_personality 
        CHECK (voice_personality IN ('professional', 'friendly', 'roast'));
    END IF; 
END $$;

