-- Add 'requested' status to group_invitations
-- Migration created: 2025-12-10

-- Update the check constraint to include 'requested' status
ALTER TABLE group_invitations
DROP CONSTRAINT IF EXISTS group_invitations_status_check;

ALTER TABLE group_invitations
ADD CONSTRAINT group_invitations_status_check 
CHECK (status IN ('pending', 'accepted', 'declined', 'requested'));

-- Update RLS policy to allow users to update their declined invitations to 'requested'
-- This replaces the existing policy
DROP POLICY IF EXISTS "Invited users can update their invitations" ON group_invitations;

CREATE POLICY "Invited users can update their invitations" ON group_invitations
  FOR UPDATE USING (
    auth.uid() = invited_user_id OR
    auth.uid() IN (SELECT created_by FROM groups WHERE groups.id = group_invitations.group_id)
  );
