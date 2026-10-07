-- ============================================================
-- AUTH TRIGGER MIGRATION
-- Requirements: 7.5, 8.1
-- Automatically creates a public.users row whenever a new
-- auth.users record is inserted (e.g., after sign-up).
-- ============================================================

-- ============================================================
-- handle_new_user() FUNCTION
-- Runs with SECURITY DEFINER so it can insert into public.users
-- even when called from the auth schema context.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, role, display_name)
  VALUES (
    NEW.id,
    'USER',
    NEW.raw_user_meta_data->>'display_name'
  );
  RETURN NEW;
END;
$$;

-- ============================================================
-- on_auth_user_created TRIGGER
-- Fires after every INSERT on auth.users, calling the function
-- above to mirror the new user into public.users.
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- DOWN:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- ============================================================
