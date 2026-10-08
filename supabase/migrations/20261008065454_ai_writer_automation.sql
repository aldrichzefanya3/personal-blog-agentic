ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check,
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('ADMIN', 'EDITOR', 'AI_WRITER'));

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_review_status TEXT NOT NULL DEFAULT 'not_applicable'
    CHECK (ai_review_status IN ('not_applicable', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS ai_meta_description TEXT
    CHECK (char_length(ai_meta_description) <= 155),
  ADD COLUMN IF NOT EXISTS ai_image_prompt TEXT
    CHECK (char_length(ai_image_prompt) <= 500),
  ADD COLUMN IF NOT EXISTS telegram_notified_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "posts_ai_writer_insert" ON public.posts;
CREATE POLICY "posts_ai_writer_insert" ON public.posts
  FOR INSERT
  WITH CHECK (
    status = 'DRAFT'
    AND author_id = (SELECT auth.uid())
    AND ai_generated = TRUE
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid()) AND u.role = 'AI_WRITER'
    )
  );

DROP POLICY IF EXISTS "posts_update" ON public.posts;
CREATE POLICY "posts_update" ON public.posts
  FOR UPDATE
  USING (
    (
      author_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (SELECT auth.uid()) AND u.role = 'EDITOR'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid()) AND u.role = 'ADMIN'
    )
  )
  WITH CHECK (
    (
      author_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (SELECT auth.uid()) AND u.role = 'EDITOR'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid()) AND u.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "posts_delete" ON public.posts;
CREATE POLICY "posts_delete" ON public.posts
  FOR DELETE
  USING (
    (
      author_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (SELECT auth.uid()) AND u.role = 'EDITOR'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid()) AND u.role = 'ADMIN'
    )
  );

CREATE TABLE IF NOT EXISTS public.ai_writer_topics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic TEXT NOT NULL UNIQUE CHECK (char_length(topic) BETWEEN 5 AND 300),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'generating', 'completed')),
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  post_id UUID UNIQUE REFERENCES public.posts(id) ON DELETE SET NULL,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_writer_topics_state_consistency CHECK (
    (state = 'pending' AND post_id IS NULL) OR
    (state = 'generating' AND post_id IS NULL AND claimed_at IS NOT NULL) OR
    (state = 'completed' AND completed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS ai_writer_topics_next_idx
  ON public.ai_writer_topics (sort_order, id)
  WHERE enabled AND state = 'pending';

ALTER TABLE public.ai_writer_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_writer_topics FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_writer_topics FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_writer_topics TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ai_writer_topics_id_seq TO service_role;

INSERT INTO public.ai_writer_topics (topic, category_id, sort_order)
SELECT seeded.topic, category.id, seeded.sort_order
FROM (
  VALUES
    ('How the internet sends information around the world', 'technology', 10),
    ('Simple ways to protect your personal information online', 'technology', 20),
    ('How search engines find and organize useful information', 'technology', 30),
    ('What happens when a computer program runs', 'programming', 40),
    ('How websites communicate with APIs in everyday language', 'programming', 50),
    ('How version control helps people work together on code', 'programming', 60),
    ('What happens when you type a website address into a browser', 'devops', 70),
    ('Why software teams use backups and how backups are tested', 'devops', 80)
) AS seeded(topic, category_slug, sort_order)
JOIN public.categories AS category ON category.slug = seeded.category_slug
ON CONFLICT (topic) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  managed_role TEXT := NEW.raw_app_meta_data->>'managed_role';
  anonymous_name TEXT := 'Anonymous-' || substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8);
BEGIN
  IF managed_role IS NULL OR managed_role NOT IN ('ADMIN', 'EDITOR', 'AI_WRITER') THEN
    RAISE EXCEPTION 'New accounts must be created by an administrator';
  END IF;

  INSERT INTO public.users (id, role, display_name)
  VALUES (
    NEW.id,
    managed_role,
    COALESCE(NEW.raw_user_meta_data->>'display_name', anonymous_name)
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;