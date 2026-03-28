## 2026-03-28 — Audit log integrity fixes

**Changes:**
- Added `supabase/add-audit-improvements.sql` migration: drops FK cascade on `audit_logs.seat_id`, adds `PUBLISH` and `RESTORE` to the action CHECK constraint
- `restoreSnapshot` now takes a pre-restore snapshot before replacing seats, diffs changed seats, and writes one `RESTORE` audit entry per changed seat
- `publishDraft` now diffs draft vs live seats and writes one `PUBLISH` audit entry per changed seat, with a one-sentence summary (e.g. "seat-042 — Alice (OCCUPIED) → Bob (OCCUPIED)")
- Added `PUBLISH` (indigo) and `RESTORE` (orange) badge styles to the audit log UI
- Updated `AuditAction` type to include `PUBLISH` and `RESTORE`

**Decisions:**
- Dropped the FK constraint on `audit_logs.seat_id` rather than switching to a label-based reference — simpler migration, audit rows now survive seat deletions/restores
- Publish audit entries show a per-seat summary sentence rather than per-field rows — cleaner in the UI, full detail is in the draft audit entries written during editing
- Restore also takes a pre-restore snapshot so the overwritten state is never lost from version history
- Publish is blocked if snapshot fails (strict mode, established last session)

**Current state:**
SQL migration needs to be run manually in Supabase (`supabase/add-audit-improvements.sql`). All TypeScript changes are in place. Pending commit.

**Next steps:**
- Run `supabase/add-audit-improvements.sql` in the Supabase SQL editor
- Commit and push
- Test: publish a draft and verify PUBLISH entries appear in audit log; restore a snapshot and verify RESTORE entries appear and a pre-restore snapshot was saved

---

## 2026-03-28 — Fix draft mode seat coloring

**Changes:**
- Added `export const dynamic = 'force-dynamic'` to `src/app/map/page.tsx` to prevent Next.js from caching the server component
- Added temporary debug logs to `MapClient.tsx`, `SeatMap.tsx`, and `map/page.tsx` to trace where `svg_rect_id` was being lost (all removed after fix)
- Reverted `svg_rect_id` fallback from `'MISSING'` back to `''` after confirming the fix worked

**Decisions:**
- Root cause was Next.js dev server caching the server component in memory — a full server restart was required to pick up the new normalization code from a previous session. `force-dynamic` prevents this going forward.
- Kept the separate `svgRectMap` lookup approach (fetching `svg_rect_id` from the live `seats` table and merging) since the Supabase JS client strips unknown columns from `seat_drafts` responses

**Current state:**
Draft mode is fully working — seats render with correct colors in draft mode. Edits go to `seat_drafts`, admins can publish or discard from the Admin page.

**Next steps:**
- Consider showing a count of changed seats in the draft banner (e.g. "X seats differ from live")
- Consider adding a visual diff view in the admin page to show what will change on publish
- Remove `export const dynamic = 'force-dynamic'` if it causes performance issues in production (the Supabase auth cookie already opts out of caching, so it may be redundant)
