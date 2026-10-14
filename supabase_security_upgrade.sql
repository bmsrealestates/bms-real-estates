-- BMS credential and attachment hardening migration.
--
-- IMPORTANT: This migration is intentionally staged, not yet compatible with
-- the current browser-only custom login. Do not apply it until the app has
-- migrated to Supabase Auth or a rate-limited credential-verification Edge
-- Function, invokes create_associate for account creation, and uses
-- authenticated signed URLs for private attachments. Applying the private
-- bucket setting before that app migration will safely block current
-- public-URL uploads/downloads.
--
-- Before rollout:
-- 1. Back up the database and inventory the current verify_associate_login
--    function, associates columns/types/constraints, grants, and RLS policies.
--    Confirm pgcrypto is available in the extensions schema and review any
--    existing Storage policies for conflicts.
-- 2. Deploy the app/Auth changes with a staged migration plan.
-- 3. Force password resets; never copy existing plaintext passwords into
--    password_hash. Remove the legacy plaintext password column only after all
--    dependent code and RPCs have been retired and the reset is verified.
-- 4. Migrate existing attachment objects/rows, then revoke public access and
--    invalidate/remove any previously shared public URLs.
--
-- Password hashes use pgcrypto bcrypt (cost 12). The verifier only returns
-- the portal's public associate fields and never returns a hash. It is granted
-- only to service_role so an Edge Function can enforce rate limits and callers
-- cannot probe credentials directly through the public anon API.

BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.associates
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE OR REPLACE FUNCTION public.verify_associate_login(
  entered_id TEXT,
  entered_pass TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_associate public.associates%ROWTYPE;
BEGIN
  IF entered_id IS NULL OR btrim(entered_id) = ''
    OR entered_pass IS NULL OR entered_pass = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid associate credentials.');
  END IF;

  SELECT a.*
    INTO v_associate
    FROM public.associates AS a
   WHERE (a.associate_id = btrim(entered_id) OR a.phone = btrim(entered_id))
     AND a.status = 'active'
   ORDER BY a.created_at DESC
   LIMIT 1;

  IF NOT FOUND
    OR v_associate.password_hash IS NULL
    OR extensions.crypt(entered_pass, v_associate.password_hash) IS DISTINCT FROM v_associate.password_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid associate credentials.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_associate.id,
      'associate_id', v_associate.associate_id,
      'name', v_associate.name,
      'phone', v_associate.phone,
      'email', v_associate.email,
      'status', v_associate.status,
      'slab', v_associate.slab,
      'slab_rate', v_associate.slab_rate,
      'earned_commission', v_associate.earned_commission,
      'photo_url', v_associate.photo_url,
      'created_at', v_associate.created_at
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.verify_associate_login(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_associate_login(TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_associate_login(TEXT, TEXT) TO service_role;

-- The admin claim must be assigned to app_metadata only by trusted server code.
-- The existing browser-only verify_admin_access flow does not create this
-- Supabase Auth claim, so it must be migrated before this RPC is called.
CREATE OR REPLACE FUNCTION public.create_associate(
  p_associate_id TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_password TEXT,
  p_slab TEXT,
  p_slab_rate TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_new_id TEXT;
BEGIN
  IF auth.uid() IS NULL
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator authorization required.'
      USING ERRCODE = '42501';
  END IF;

  IF p_password IS NULL OR length(p_password) < 12 THEN
    RAISE EXCEPTION 'Password must contain at least 12 characters.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.associates (
    associate_id,
    name,
    phone,
    email,
    password_hash,
    status,
    slab,
    slab_rate,
    total_sales,
    earned_commission,
    photo_url
  )
  VALUES (
    p_associate_id,
    p_name,
    p_phone,
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf', 12)),
    'active',
    p_slab,
    p_slab_rate,
    '₹ 0',
    '₹ 0',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300'
  )
  RETURNING id::TEXT INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_id,
    'associate_id', p_associate_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_associate(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_associate(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Private storage requires authenticated users, one folder per Supabase Auth
-- UID, and a trusted app_metadata role claim for administrator reads/deletes.
-- Replace app-side getPublicUrl usage with authorized signed URLs first.
UPDATE storage.buckets
   SET public = false
 WHERE id = 'message-attachments';

DROP POLICY IF EXISTS "BMS authenticated attachment upload" ON storage.objects;
CREATE POLICY "BMS authenticated attachment upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "BMS owner or admin attachment read" ON storage.objects;
CREATE POLICY "BMS owner or admin attachment read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    )
  );

DROP POLICY IF EXISTS "BMS owner or admin attachment delete" ON storage.objects;
CREATE POLICY "BMS owner or admin attachment delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    )
  );

-- Restrictive policies prevent any older permissive anon/authenticated
-- policies from widening access to objects in this bucket.
DROP POLICY IF EXISTS "BMS block anon attachment access" ON storage.objects;
CREATE POLICY "BMS block anon attachment access"
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (bucket_id <> 'message-attachments')
  WITH CHECK (bucket_id <> 'message-attachments');

DROP POLICY IF EXISTS "BMS restrict authenticated attachment access" ON storage.objects;
CREATE POLICY "BMS restrict authenticated attachment access"
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    bucket_id <> 'message-attachments'
    OR (storage.foldername(name))[1] = auth.uid()::TEXT
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    bucket_id <> 'message-attachments'
    OR (storage.foldername(name))[1] = auth.uid()::TEXT
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
