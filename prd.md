# SeatMap — OGP Office Seat Management Tool

## Problem

There's no single source of truth for which seats in the OGP office are occupied, available, or reserved. When new joiners arrive, the corp team has to manually check around to figure out where to put them. This tool fixes that by providing a visual, always-up-to-date seat map that anyone can view and editors can manage.

## Project Setup

### Stack (inherited from starter kit):

- Next.js
- Supabase (database + auth)
- Supabase JS client
- shadcn/ui

### Auth

- login via Supabase magic link

### Deployment:

- Vercel for initial deployment (quick prototype)

## Data Model

### Seat
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `floorId` | uuid | FK → Floor |
| `svgRectId` | text | Matches `id` attribute on `<rect>` in SVG |
| `label` | text | e.g. `seat-001`. Editable by editors. |
| `status` | enum | `AVAILABLE`, `OCCUPIED`, `RESERVED` |
| `occupantName` | text? | Free text. Null if unoccupied. |
| `occupantTeam` | text? | Free text. Null if unoccupied. |
| `notes` | text? | Optional notes on the seat |

### Floor
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | e.g. `Level 5` |
| `svgContent` | text | Full SVG markup stored as text |

### AuditLog
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `seatId` | uuid | FK → Seat |
| `editorEmail` | text | From auth session |
| `action` | text | e.g. `ASSIGN`, `UNASSIGN`, `MOVE`, `RESERVE`, `UPDATE` |
| `field` | text? | Which field changed |
| `oldValue` | text? | Previous value |
| `newValue` | text? | New value |
| `createdAt` | timestamp | Auto-set |

## Design Decisions

- Occupant info (`occupantName`, `occupantTeam`) is stored directly on the Seat row as free text — there is no separate Person table
- Seat positions are NOT stored in the database — they live in the SVG. The SVG is the layout source of truth, the DB is the status/assignment source of truth
- `svgRectId` links each DB seat record to its corresponding `<rect>` element in the SVG
- `Floor` model exists even though MVP is single-floor — avoids painful migration later
- `occupantTeam` is free text but should offer autocomplete from existing values in the UI
- SVG content stored directly in DB as text — no file upload or blob storage needed

## Features — MVP

### 1. Editor: Seat Management

SVG floor plan in the main area. Top navigation area with search and filters.

#### SVG Map (main area)

- SVG rendered inline in the page (not as an `<img>`) so individual `<rect>` elements can be styled
- On load, fetch all seats from DB, then set each seat's `fill` colour based on its status:
  - Green = AVAILABLE
  - Red = OCCUPIED
  - Yellow/Amber = RESERVED
- Hovering a seat rect shows a tooltip: seat label, status, occupant name + team (if assigned), notes
- Clicking a seat rect opens a detail modal with full info
- Legend showing colour meanings

#### Search & Filter

- Search by occupant name or seat label (most users are going to search by name. Matching seats are highlighted on the map.
- Filter by status (Available / Occupied / Reserved)
- Filter/highlight by team — selecting a team (e.g. "Pair") highlights all seats for that team on the map and filters the sidebar. Non-matching seats are dimmed on the map, not hidden, so spatial context is preserved
- Summary stats bar: "42 occupied · 8 available · 3 reserved". Stats update to reflect active filters. Located in the top navigation area, to the right of the filters.

#### Manage seats

- Click a seat rect on the SVG to edit: change status, enter occupant name + team, update notes
- Editing actions are displayed in a modal window
- On hover, show a tooltip with the following information:
  - Seat label
  - Status
  - Occupant name + team (if assigned)
  - Notes
- **Assign person to seat:** Click an available seat → enter occupant name + team (free text) → set status to Occupied
- **Move person:** Click an occupied seat → "Move" → click destination seat → person is moved, old seat auto-vacates to Available. If the destination seat is occupied, the displaced person swaps seats with the person who was in the old seat. The system handles this in a single transaction.
- **Unassign person:** Click an occupied seat → "Unassign" → occupant fields are cleared, status becomes Available
- **Person leaves:** Unassign them manually. Seat becomes Available.
- Editors can rename seat labels if the auto-generated ones aren't useful

### 2. SVG Import

- Floor plan comes in the form of an SVG file
- For the MVP, the SVG file is hardcoded in the app. It's a file that I will provide. There is no upload functionality in the MVP.
- App parses the SVG, auto-detects all `<rect>` elements by fill colour:
  - Blue rects → seats, labelled `seat-001`, `seat-002`, etc.
- Rects are detected by fill colour. Define an acceptable blue colour range in config (e.g. blue = `#0000FF`-ish). Log any rects that don't match for manual review.
- App injects an `id` attribute into each detected rect in the SVG (e.g. `id="seat-001"`) and stores the modified SVG in the DB
- Creates corresponding Seat records in the DB
- Editor reviews the detected seats (count, positions look right) before confirming
- Re-importing an SVG should detect new/removed rects and reconcile with existing seat records. Known limitation: if a seat that is currently occupied is removed from the SVG, this is not handled — the editor must manually unassign it first.

### 3. Audit Log Viewer

**All edits automatically create an AuditLog entry.**

Simple chronological feed of changes.

**Behaviour:**

- Reverse-chronological list of changes
- Each entry shows: timestamp, who changed it, what seat, what changed (old → new)
- Filter by seat label or by editor email
- Paginated (20 per page)

## Access Control

**For MVP, scope this out but don't fully implement. Plan for it in the architecture.**

Current approach (MVP):

- Login is required to view or edit the map
- Anyone logged in can edit

Future approach (post-MVP):

- Role-based: `VIEWER` (default), `EDITOR`, `ADMIN`
- Editors are explicitly added by admins
- Consider restricting to specific email domains or a whitelist

## Technical Notes

### SVG Floor Plan Rendering

- Render SVG inline using `dangerouslySetInnerHTML` (sanitise first!) or a React SVG parser
- On the client, after render, query all seat rects by their `id` attribute and attach event listeners (hover, click)
- To colour a seat: `document.getElementById(svgRectId).setAttribute('fill', statusColour)`
- Or better: use React refs and manipulate the SVG DOM via React, not raw DOM queries
- SVG should be responsive — use `viewBox` and let it scale to container width

### SVG Parsing (Server-side)

- Parse SVG on the server during import using a library like `svg-parser` or `cheerio`
- Detect `<rect>` elements by their `fill` attribute:
  - Blue-ish fills (configurable threshold) → seats
- Also detect `<rect>` elements inside `<g>` groups — the SVG may have nested structure
- Handle both hex colours (`#0000FF`) and named colours (`blue`) and rgb() notation
- Assign sequential IDs: `seat-001`, `seat-002`, etc.
- Inject `id` attributes into the SVG markup before storing
- Return a summary to the editor: "Found 48 seats"

### SVG Colour Config

Define acceptable colour ranges as constants. Be somewhat flexible with matching:

```typescript
const SEAT_COLOUR_CONFIG = {
  SEAT: {
    description: "Blue rectangles",
    match: (fill: string) => isBlueish(fill),
  },
};
```

### Seat Operations (Key Workflows)

These are the core actions the system needs to handle cleanly:

**Assign person to seat:**

1. Seat must be AVAILABLE or RESERVED
2. Editor enters occupant name + team (free text)
3. Set `seat.status` → OCCUPIED
4. Audit log: "Alice Chen assigned to seat-012"

**Unassign person from seat:**

1. Editor clicks "Unassign" button in the seat modal
2. Set `seat.occupantName` → null, `seat.occupantTeam` → null, `seat.status` → AVAILABLE
3. Audit log: "Alice Chen unassigned from seat-012"

**Move person to another seat (destination is empty):**

1. Vacate old seat: clear occupant fields, `oldSeat.status` → AVAILABLE
2. Assign new seat: copy occupant fields, `newSeat.status` → OCCUPIED
3. Single transaction, two audit log entries
4. Audit log: "Alice Chen moved from seat-012 to seat-034"

**Move person to another seat (destination is occupied — swap):**

1. Swap occupant fields between both seats
2. Statuses remain OCCUPIED on both seats
3. Single transaction
4. Audit log: "Alice Chen moved from seat-012 to seat-034, swapping with Bob Tan"
5. The UI should warn the editor: "This seat is occupied by Bob Tan. Swap Alice Chen with Bob Tan?"

**Reserve a seat manually (no person):**

1. Seat must be AVAILABLE (no occupant)
2. Set `seat.status` → RESERVED, add a note explaining why (e.g. "Holding for Design hire")
3. Audit log: "seat-034 reserved — Holding for Design hire"

**Person leaves the company:**

1. Editor clicks "Unassign" on the occupied seat
2. Set `seat.occupantName` → null, `seat.occupantTeam` → null, `seat.status` → AVAILABLE
3. Audit log: "Alice Chen unassigned from seat-012"

### Audit Log Generation

- Create a shared utility `createAuditLog(seatId, action, field, oldValue, newValue, editorEmail)`
- Call this in every seat mutation procedure (in the same transaction where possible)
- Log the editor's email from the session

### Team Autocomplete

- `occupantTeam` field should offer suggestions from existing unique team values in the database
- Simple query: `SELECT DISTINCT occupantTeam FROM Seat WHERE occupantTeam IS NOT NULL`
- This keeps it lightweight — no separate Team model needed

## Out of Scope (Future)

- **Draft seating plans** — Leadership can create draft plans to reorganise seating (e.g. after a reorg or new team spin-up) without affecting the live map. Clone current seat state into a draft, rearrange occupants, then apply when ready. Key details:
  - _Recommended approach:_ Clone-based drafts (Approach A). Clone all Seat records with a `draftId` FK. Edit the clones freely. "Apply" copies draft state back to live seats as a single batch audit log entry. Data duplication is negligible at this scale (~200 seats).
  - _Collaboration:_ TBD — at minimum, shareable read-only link for other leads to review.
  - _Draft lifecycle:_ Create → Edit → Review diff → Apply (or discard). Multiple drafts can exist but only one can be applied at a time.
- **Google Calendar availability integration** — Show real-time seat availability based on whether the assignee is WFH or in-office that day (via Google Calendar). Even if a seat is "occupied" (assigned), viewers could see it's actually free today because the assignee is working from home. This turns the static seat map into a live availability view for hybrid workers.
- Role-based access control (EDITOR / ADMIN roles with explicit assignment)
- Multiple floors/locations
- Seat booking system (temporary reservations)
- Integration with HR systems for automatic occupant updates
- CSV import/export of seat assignments
- Notifications (e.g. email when a reserved seat becomes available)
