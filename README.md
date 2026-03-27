# SeatMap

An office seat management tool. View the floor plan, assign people to seats, reserve seats, and track changes via an audit log.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to the login page — enter your work email to receive a magic link.

## Updating the floor plan

When you get a new SVG from the designer, use the safe update script rather than re-seeding. It preserves all existing seat assignments and only changes what's different.

### One-time setup

Run this SQL in the Supabase SQL editor (only needed once):

```
supabase/add-floor-snapshots.sql
```

### How to update

1. Replace `floor-plan.svg` in the project root with the new file
2. Run the update script:

```bash
npm run update-floor
```

The script will:
- Save a snapshot of the current state before making any changes
- Keep all existing seat assignments untouched
- Add any new seats from the SVG as Available
- Warn you about any seats that are no longer in the new SVG (but won't delete them)

### Rolling back

If something looks wrong after an update, you can restore any previous version:

```bash
# See all saved snapshots
npm run list-snapshots

# Restore a specific snapshot by ID
npm run restore-snapshot <snapshot-id>
```

Restoring rolls back both the SVG and all seat data (assignments, reservations, notes) to exactly the state they were in when the snapshot was taken.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run seed` | First-time setup: parse SVG and populate the database |
| `npm run update-floor` | Safely update the floor plan SVG without losing seat data |
| `npm run list-snapshots` | List all saved floor plan snapshots |
| `npm run restore-snapshot <id>` | Roll back to a previous snapshot |
