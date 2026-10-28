# Pengingat Ourstory

Dashboard includes **Sebentar lagi ♡**. Both authorized members share special dates and anniversary records; trips are derived from existing trip dates (no duplicate reminder records). Archived/deleted/completed trips and deleted special dates are excluded. Annual dates roll forward, with anniversary age calculated from the original relationship date. February 29 is observed on the last day of February in both the dashboard and exported calendars.

## Activate the database

The administrator ran `supabase/migrations/004_special_days.sql` in Supabase SQL Editor after migrations 001–003 and confirmed success with a screenshot on 2026-10-28. The coding agent did not use administrative credentials. It adds one private table with membership-only RLS, audit/version triggers, restricted writable columns, and Realtime publication. It does not change existing albums, photos, trips or member authorizations. Existing application features and trip calendar exports work if this table is not installed; special-date editing stays disabled with an activation message.

## Calendar behavior

- Google Calendar opens a prefilled event, including yearly recurrence for special dates. Users choose Google notification settings before saving. The title and dates are sent to Google only when users follow that link.
- `.ics` download is generated entirely on the device. It includes stable event UIDs, revision numbers, all-day inclusive travel dates (exclusive `DTEND`), yearly recurrence, escaped text, UTF-8 folding, and two display alarms at **09:00 in the calendar's local timezone**: H-7 + day H for annual events, H-7 + H-1 for travel. Reference: RFC 5545 sections 3.1, 3.3.10, 3.6.1, 3.6.6, 3.8.6.3.
- Calendar notification support varies. No push service, Google OAuth calendar permission, background scheduler or automatic calendar sync is introduced. Users must save the calendar event and enable calendar notifications themselves.
- Every calendar event is a copy, not a subscription. Edits/deletions require manual calendar updates. Reimporting can duplicate events in some clients despite stable UIDs; the UI warns against repeatedly importing the same date.
- iPhone import behavior depends on the app/file-opening context. The UI gives Google Calendar and Mac Calendar as alternatives when Safari's downloaded file does not offer calendar import. Actual Apple Calendar import/notification delivery has not been verified on a physical iPhone.

Calendar formatting reference: [IETF RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545).

## Verification

Unit tests cover rollover, anniversary counts, leap years, trip timezones and filtering, ICS escaping/injection prevention, UTF-8 line lengths, dates, alarms, UIDs and recurrence. The PGlite suite runs migration 004 against PostgreSQL and verifies two-member sharing, optimistic concurrency, validation and anonymous/outsider denial. Browser fixtures use synthetic events, never production personal data, to cover create/edit/delete, Google calendar link recurrence, `.ics` download, mobile overflow and missing-migration isolation in WebKit and Chrome. WebKit is not a physical Safari/iPhone test.
