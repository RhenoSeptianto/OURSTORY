# Rotating Polaroids — audit and approval proposal

Historical audit proposal. The user subsequently approved the additive design. Implementation and current activation instructions are in `docs/POLAROID_GALLERY.md`; the approved migration is `supabase/migrations/003_dashboard_polaroids.sql`. The proposal copy is kept for review history only and has not been applied to the connected project. Source baseline: commit `0c14f86`.

## Verified baseline

- Clean working tree before audit.
- `npm run lint`: passed.
- `npm test`: 13 passed, 3 files.
- `npm run build`: TypeScript, Vite and PWA generation passed.
- No new browser/device or live security tests claimed at the audit stage.

## Existing code and exact gap

`Dashboard` in `src/App.tsx` displays the next trip's `cover_path` inside `.hero-art .polaroid.big`. It has no independent gallery state. The hero, caption strip, tape, postmark and responsive sizes in `src/style.css` can be preserved with new styles scoped to the gallery.

`memory_photos` already provides stable photo IDs, private object paths and byte sizes. `memories` supplies album titles and trash state; standalone albums are supported by migration 002. There is no shared application settings table and no fields for dashboard selection, ordering or crop parameters. Reusing trip covers or embedding JSON in an album story would conflate unrelated content and would not meet safe shared configuration requirements.

`src/components.tsx` already contains a dialog with focus handling, an uploader, and expiring private image URLs. `src/images.ts` supplies the tested WebKit-compatible optimization pipeline. Existing `save()` uses `id + version`, and `stamp_record()` sets editor, timestamps and the next version. `public.is_member()` and the private `memories` bucket supply existing security boundaries.

## Smallest proposed database addition

One table, `dashboard_polaroids`, with exactly one shared row. Its ordered `photos` JSON array holds at most five entries. Each entry stores an existing `memory_photos.id`, optional caption (normalized as an empty string), contain/cover mode, X/Y position and zoom. It never stores a signed URL or a copy of the image. Array order is display order. Version/editor/timestamps reuse the existing trigger; a save atomically replaces the array only if the version matches.

The SQL proposal is in `dashboard-polaroids.sql`. It has NOT been executed or added to automatic migrations. It adds only the new table, its validation function/triggers and policies, and its Realtime publication entry. No existing business table, RLS policy, bucket policy or login configuration is altered.

### Security implications

- Only `public.is_member()` members may read or update the new configuration.
- Clients can update only `photos`; no insert/delete privileges or membership changes.
- Validation rejects more than five photos, duplicates, arbitrary extra fields, malformed crop values, captions over 120 characters and references to missing/trashed album photos.
- No new Storage rights; image access still uses the current private bucket and expiring signed URLs.
- Rows are private even through direct API requests. New RLS and validation must be tested before claiming live security verification.
- The existing Realtime hook does not fetch gallery settings; a gallery-specific hook will reuse the existing Supabase client, subscribe only while authorized, refresh on reconnect/focus and dispose cleanly. Other pages/hooks do not need restructuring.

### Source-photo deletion

JSON references are intentionally not foreign keys. If a source photo is removed or its album moves to trash, the gallery resolves selections against available active photo IDs and omits missing entries immediately after the existing data refresh. The editor will explain the omission; the next save prunes stale references. No new trigger changes existing photo-deletion behavior. Removing a selection never removes the source file or photo record.

## Concrete editing and upload flow

1. An edit button near the existing Polaroid opens **Customize Our Polaroids ♡**. Draft state is separate from saved state; save/cancel are explicit.
2. Prefer picking from active Memories, with album/title filtering and lazy previews. Reuse photo IDs without copying files or loading every full-resolution image.
3. New images are optimized using the current helper and kept as local preview blobs until Save. Cancel discards the draft and frees blobs without creating remote files.
4. On Save, new uploads become ordinary photos in a clearly named standalone Memories album, using existing album/photo APIs. Config is then saved with the original version. If a later step fails, report accurately which photos were stored in Memories and keep the editor open; reusing their new IDs prevents retry duplicates. Never delete committed Memories photos during config rollback.
5. Reorder with touch-sized up/down controls; optional captions; default **show full image**. A separate positioning view offers live drag/zoom and Reset without changing source pixels. Crop metadata affects only the dashboard rendering.
6. No hardcoded personal photos or public URLs. No generative processing.

## Carousel behavior

- Zero: original placeholder with “Add our first memory ♡”. One: static photo with no timer. Two to five: six-second rotation.
- Fixed media aspect ratio, existing rotated Polaroid frame; crossfade and dots, desktop arrows and mobile horizontal swipe. Vertical touch gestures remain normal page scrolling.
- Manual navigation resets the interval. Pause on hover, keyboard focus, editor open or hidden tab. Reduced-motion preference disables autoplay/crossfade and keeps manual navigation available. Clean up listeners and timer on unmount.
- Private URLs refresh using the existing pattern; image-load failures show a local fallback. Only the current/next selected images need preloading.
- Offline editing stays disabled; no local-only configuration presented as synchronized.

## Next stage, only after database-design approval

Implement focused gallery/editor components locally, add tests for limits/draft cancellation/order/crop/timers/version conflicts, verify responsiveness and WebKit/Chrome, and prepare the additive migration for administrator installation. Keep the existing auth, CRUD, routing, PWA and deployment configuration intact. Production deployment requires a separate explicit instruction, per the enhancement brief. Real-device Safari/PWA and cross-device verification remain manual acceptance items until actually exercised.
