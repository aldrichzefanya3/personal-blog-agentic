-- Require legacy accounts to be removed through Supabase Auth before enforcing
-- the two-role model; silently promoting USER accounts would grant admin access.
ALTER TABLE public.users
	DROP CONSTRAINT IF EXISTS users_role_check;

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM public.users WHERE role = 'USER') THEN
		RAISE EXCEPTION 'Remove legacy USER accounts before applying this migration';
	END IF;
	IF (SELECT count(*) FROM public.users WHERE role = 'ADMIN') > 1 THEN
		RAISE EXCEPTION 'At most one ADMIN account may exist before applying this migration';
	END IF;
END;
$$;

ALTER TABLE public.users
	ALTER COLUMN role SET DEFAULT 'EDITOR',
	ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'EDITOR'));

CREATE UNIQUE INDEX IF NOT EXISTS users_single_admin_idx
	ON public.users (role)
	WHERE role = 'ADMIN';

CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	IF OLD.role = 'ADMIN' THEN
		PERFORM pg_catalog.pg_advisory_xact_lock(741852, 963);

		IF (SELECT count(*) FROM public.users WHERE role = 'ADMIN') <= 1 THEN
			RAISE EXCEPTION 'The only ADMIN account cannot be removed or demoted'
				USING ERRCODE = '23514';
		END IF;
	END IF;

	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_last_admin_removal ON public.users;
CREATE TRIGGER prevent_last_admin_removal
	BEFORE DELETE OR UPDATE OF role ON public.users
	FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();

REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_removal() FROM PUBLIC, anon, authenticated;

-- Preserve posts and uploaded media when an account is removed.
ALTER TABLE public.posts
	ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE public.posts
	DROP CONSTRAINT IF EXISTS posts_author_id_fkey,
	ADD CONSTRAINT posts_author_id_fkey
		FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.media
	ALTER COLUMN uploader_id DROP NOT NULL;

ALTER TABLE public.media
	DROP CONSTRAINT IF EXISTS media_uploader_id_fkey,
	ADD CONSTRAINT media_uploader_id_fkey
		FOREIGN KEY (uploader_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- New public.users rows are only created through trusted Supabase Auth admin APIs.
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
	IF managed_role IS NULL OR managed_role NOT IN ('ADMIN', 'EDITOR') THEN
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
