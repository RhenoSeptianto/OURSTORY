# Polaroid dashboard — implementation and activation

Implemented locally after explicit approval of the one-table additive design. **No production push/deployment and no connected Supabase migration have been performed for this enhancement.** Migration execution in disposable local tests does not change the online database.

## What is ready

- Existing hero layout, scrapbook frame, slogan, colors and navigation are preserved. Only the Polaroid contents and its edit control are enhanced.
- Zero-photo invitation; one photo without autoplay; two to five with a six-second crossfade, dots, desktop arrows, keyboard arrows and horizontal swipe. The container stays the same size while photos change.
- Autoplay pauses for hover, focus, editor open, hidden tab and reduced-motion preference. Reduced motion leaves manual navigation available. Visibility changes stop/restart the timer directly, including the WebKit scheduling edge found during tests.
- **Customize Our Polaroids ♡**: choose existing private Memories photos without duplication, deferred new uploads, reorder, replace, remove selection, captions, preview, reversible crop/zoom/reset. On mobile the editor is a scrollable bottom sheet with safe-area padding and touch-sized management controls.
- Full-image `contain` is the default to avoid cutting off faces. Crop is CSS-only metadata; it does not overwrite any original photo.
- New images are optimized using the current `src/images.ts` pipeline. They remain local until Save. Cancel releases local previews; removal/replacement releases unused blobs promptly. Saved uploads become ordinary photos in a standalone **Our Polaroids ♡** album.
- Existing configuration is copied into a draft; no settings write occurs until Save. One atomic ID/version-checked update prevents silently overwriting another editor. Retry reuses stable upload/photo IDs and preserves committed Memories records.
- Missing/deleted/trashed source photos are omitted from the dashboard. The editor retains their references with a warning until the user explicitly removes them or refreshes the photo list. Saving unresolved references is blocked, preventing a delayed metadata refresh from silently dropping another device's photo.
- Only current, next and previous selected images are mounted for transitions. The Memories picker reveals twelve previews at a time and supports album-title/caption search.
- A gallery-specific hook reuses the current Supabase client and private image helper; it refreshes on Realtime, focus, reconnect and manual retry. Missing schema or offline access leaves an isolated placeholder and disables the editor instead of breaking the dashboard.

## Database activation — next administrator step

1. Read `supabase/migrations/003_dashboard_polaroids.sql`.
2. Run only that file in the existing project's Supabase SQL Editor, after 001 and 002 already installed. It is safe to repeat without clearing saved gallery settings.
3. The script creates one singleton `dashboard_polaroids` row with an ordered JSON array. Entries store photo UUID, caption, fit, X/Y and zoom. It reuses `is_member`, `stamp_record`, `audit_record` and adds the table to the existing Realtime publication.
4. Existing tables, business logic, bucket policies and Google Auth configuration remain intact. No client insert/delete grants; members can update only `photos`. Direct outsider/anonymous reads/writes remain denied. URLs/blobs cannot be stored as arbitrary extra JSON fields.
5. After migration success, validate the local feature with an authorized session. Production publishing is a separate user-authorized step; pushing `main` would trigger the existing deployment workflow, so it has intentionally not been done.

## Code changes

| File | Purpose |
| --- | --- |
| `src/App.tsx` | Replace the one hero Polaroid element with `PolaroidGallery`; no route or CRUD changes |
| `src/polaroids/PolaroidGallery.tsx` | Hero integration, statuses and portal editor |
| `src/polaroids/PolaroidPlayer.tsx` | Fixed frame, crossfade, navigation, pause/timer lifecycle |
| `src/polaroids/PolaroidEditor.tsx` | Local draft, picker, captions, positioning, uploads and Save/Cancel |
| `src/polaroids/api.ts`, `model.ts`, `usePolaroids.ts` | Private/versioned persistence, upload retry, selection rules and subscriptions |
| `src/polaroids/polaroids.css` | Scoped hero/editor styles, including mobile safe areas |
| `src/components.tsx` | Optional dialog class for isolated styling; graceful image load fallback |
| `supabase/migrations/003_dashboard_polaroids.sql` | Approved additive table, validation and RLS |
| `src/polaroids/*.test.ts` | Selection logic and real SQL policy tests |
| `browser-tests/polaroids*` | Synthetic browser harness and gallery integration tests; excluded from the production build |
| `package.json`, lockfile | PGlite as a development-only SQL test engine, not an application backend |

## Verification and limits

Final local results: **28 unit/SQL tests passed** (5 files, including 6 PostgreSQL RLS tests); **42 browser tests passed** (21 WebKit mobile profile, 21 Chrome, including the existing image-upload regression scenarios). ESLint, TypeScript/production build, asset/manifest checks and dependency audit passed; audit reported zero vulnerabilities. Editor screenshots for 320/390/768 px are local ignored artifacts in `test-results/`. Routing/Auth/PWA configuration, deployment workflow and migrations 001/002 were checked with Git and remain unchanged.

Production-preview smoke also passed: login/setup at 320/390/768/1440 px without horizontal overflow, correct project-path service-worker control, offline app-shell reload and no uncaught JavaScript exceptions. Its first attempt could not navigate because the preview server was not running; after starting the local preview, the unchanged smoke script passed. No provider settings were changed for this check.

Baseline before implementation: lint passed, 13 tests passed, TypeScript/build/PWA passed.

Selection tests cover max-five, duplicates, crop bounds, immutable reorder, source resolution, discarded local fields, original caption preservation and emoji-safe truncation. Six SQL tests run the actual 001/002/003 migrations against PostgreSQL WASM through PGlite with test-local Supabase auth/storage scaffolding. They verify both members, outsider/anon denial, version conflicts, JSON validation, update-only column grants, membership protection, source preservation and repeat installation. This is SQL/RLS verification, **not a live Supabase integration or Google OAuth test**.

Browser tests use the actual gallery/editor and image components with a test-only storage/database stand-in and synthetic shapes. They exercise Save/Cancel, limits/replacement, captions/crop/drag/reset, source removal, failed upload/metadata/config recovery, no duplicate retry uploads, browser reload, another page in the same context, offline/missing-schema behavior, timers/visibility/reduced motion, swipe and responsive editor at 320/390/768 px. That second page is not a claim of two real Google accounts or live Realtime verification.

Chrome and Playwright WebKit are available on Windows. **Safari on a physical iPhone, installed iOS PWA, actual two-account Supabase Realtime and direct live Storage/API security checks remain manual acceptance tests after activation.** No administrative credentials or private photos were needed for automated tests. The sample SQL and browser fixtures contain only test identities and generated shapes.

Run checks with `npm run lint`, `npm test`, `npm run build`, `node scripts/verify-build.mjs`, and `npm run test:images`. The latter uses the existing Playwright configuration, with the new gallery scenarios discovered automatically. No routing, PWA, base-path, Google OAuth or deployment-workflow configuration has changed.
