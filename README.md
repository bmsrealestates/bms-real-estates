# BMS Real Estates — Associate Portal

Responsive React + Vite portal for associate operations, leads, site visits, announcements, messages, and commission slabs.

## Local setup

1. Install Node.js 20.19+ (or a current Node.js LTS supported by Vite).
2. Run `npm ci`.
3. Copy `.env.example` to `.env` and set the Supabase project URL and publishable/anon key.
4. Run `npm run dev` for local development.
5. Run `npm run build` to create the production bundle in `dist/`.

## Vercel deployment

- Import the GitHub repository into Vercel with the Vite framework.
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Project Settings → Environment Variables for Production (and Preview if needed).
- Deploy. `vercel.json` configures Vite's `dist` output and SPA fallback routing.
- If sign-in reports `Invalid API key`, copy the current anon/publishable key from the same Supabase project as `VITE_SUPABASE_URL`, update local `.env` or Vercel environment variables, and restart/redeploy. The Auth health endpoint can be reachable even when the data API rejects a mismatched key.

## Inquiry attachments

- **Current implementation is not safe for confidential attachments.** It uploads directly with the browser anon key to `message-attachments` and stores a public URL. Files in a public bucket are readable by anyone who obtains the URL, and removing a message does not delete its object.
- Do not upload customer identity, financial, or other confidential documents. To support confidential attachments, migrate to a private bucket and server-verified authorization for uploads and downloads (for example, an authenticated backend issuing short-lived signed URLs). The app's custom local-storage associate/admin roles do not authenticate Storage requests and cannot provide this authorization by themselves.
- Before using sensitive files, make the bucket private, remove permissive anonymous Storage policies, migrate or delete existing objects, and remove/replace existing public URLs in `messages`. Changing the bucket setting does not revoke URLs that were copied elsewhere if the files remain publicly accessible.
- Keep file size and MIME-type restrictions in place in both the UI and Storage configuration; client-provided file types alone are not a security boundary.

## Realtime updates, associate sessions, and activity logs

- Add `last_seen timestamptz` to `public.associates`. The app updates it on associate login and every 60 seconds while an associate session is active.
- Admin views refresh every 3 seconds as a fallback and also subscribe to Supabase Realtime. Realtime delivery requires the relevant tables to be in the `supabase_realtime` publication; polling continues if Realtime is unavailable.
- Associate sessions are validated on sign-in, every 10 seconds, on window focus, and after Realtime updates for the associate/device. Sign-in is blocked if device registration fails. `validate_associate_device` must return `{ "valid": false }` when an account is deactivated, the device is revoked, or `force_logout_at` is newer than that device's `last_login`. The admin-only `revoke_associate_devices` RPC must revoke devices and set `force_logout_at`.
- The browser keeps an existing session during temporary validation/network errors and retries; no client can guarantee a remote logout while the Supabase service is unreachable. Do not install a function that always returns `valid: true`.
- Create `public.activity_logs` with `id` (primary key), `associate_id`, `associate_name`, `action`, `device`, and `created_at timestamptz default now()`. `action` values written by the app are `LOGIN`, `LEAD_ADD`, `VISIT_BOOK`, and `INQUIRY`.
- Configure RLS for the app's actual authorization model before enabling these records. The portal uses a public Supabase anon key and custom client-side roles, not Supabase Auth identities; an unrestricted `anon` policy allows unauthenticated users to read, insert, or alter logs and must not be treated as secure admin-only access. Use a server-verified policy/API for sensitive audit records.
- Until the table/column or required permissions are available, heartbeat and activity-log errors are reported to the browser console without blocking portal actions. Admin activity logs show an unavailable message until readable.

## Portal audio

- The authenticated header provides one looping piano track: [Relaxing Piano Music](https://commons.wikimedia.org/wiki/File:Relaxing_Piano_Music_(ISRC_USUAN1500075).mp3) by Kevin MacLeod (incompetech.com), licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Ambient music attempts to start after successful login at 20% volume and is user-controllable.
- Browser autoplay policies or network availability may prevent playback; the header control can retry playback. The track repeats when it ends.
- Toasts use a short public-domain [singing bowl sound](https://commons.wikimedia.org/wiki/File:SingingBowl1.ogg) from Wikimedia Commons. No synthesized audio is used.

## Security checklist before production

- Do not commit `.env`, `.env.local`, Supabase service-role keys, passwords, or tokens.
- The browser anon/publishable key is not a secret; database safety depends on correct Supabase Row Level Security (RLS) policies.
- Verify RLS policies for `associates`, `leads`, `site_visits`, `announcements`, and `messages` in Supabase before using real customer data.
- **Current associate credential management is not safe for real passwords.** The browser writes the supplied password directly to `associates.password` when creating an account or changing its password. The `verify_associate_login` implementation is outside this repository, so this project cannot verify that existing values are hashed or that the RPC checks passwords safely. Do not use real or reused credentials until this is migrated.
- Migrate credential creation, reset, and verification to a server-verified flow (preferably Supabase Auth, otherwise an authorized backend/RPC using a modern password hash such as bcrypt or Argon2 and rate limiting). Never return stored hashes or write raw passwords through table CRUD. Remove legacy plaintext password values and force resets for any credentials that may already have been stored or exposed. The `verify_associate_login` RPC and account-management path must be updated together.
- Associate device registration and session validation use `register_associate_device` and `validate_associate_device`; sign-in is denied if device registration is unavailable. Verify that the validation and revocation RPCs enforce the server-side checks above.
- The admin login depends on the existing `verify_admin_access` database RPC. The `revoke_associate_devices` RPC must independently verify admin authorization: the browser's role is not a trusted identity, and frontend checks alone cannot enforce admin authorization.
- Do not treat a role or session saved in browser local storage as authorization. Enforce all access rules in the database/API.
- `supabase_security_upgrade.sql` is a staged migration template for bcrypt password hashes, server-authorized associate creation, and private inquiry attachments. Its password verifier is service-role-only for use through a rate-limited Edge Function. It is not compatible with the current browser-only custom login and public-URL attachment flow yet. Do not run it until the auth/backend and app have been migrated together; its comments list the required rollout steps. It does not auto-hash legacy passwords or migrate existing public attachment URLs.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — Oxlint
