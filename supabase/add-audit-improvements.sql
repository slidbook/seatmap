-- Audit log improvements
-- Run this in the Supabase SQL editor

-- 1. Drop the foreign key constraint so audit history survives seat deletions
--    (e.g. when restoring a snapshot replaces all seat rows)
alter table audit_logs drop constraint audit_logs_seat_id_fkey;

-- 2. Add PUBLISH and RESTORE to the allowed action values
alter table audit_logs
  drop constraint audit_logs_action_check;

alter table audit_logs
  add constraint audit_logs_action_check
  check (action in ('ASSIGN', 'UNASSIGN', 'MOVE', 'RESERVE', 'UPDATE', 'PUBLISH', 'RESTORE'));
