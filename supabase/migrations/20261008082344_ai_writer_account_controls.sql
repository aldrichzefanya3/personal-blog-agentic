ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ai_writer_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_ai_writer_enabled_role_check,
  ADD CONSTRAINT users_ai_writer_enabled_role_check
    CHECK (role = 'AI_WRITER' OR ai_writer_enabled = FALSE);