-- Fix security vulnerability in invitation acceptance
-- Migration created: 2025-12-14
-- 
-- SECURITY ISSUE: Previously, invited users could modify group_id on their invitation
-- and then set status='accepted', causing the trigger to add them to any arbitrary group.
-- This migration fixes the vulnerability by:
-- 1. Preventing users from changing group_id, invited_user_id, or invited_by fields
-- 2. Using OLD.group_id in the trigger to prevent exploitation
-- 3. Adding validation that critical fields haven't changed

-- Update the trigger function to use OLD.group_id and validate no tampering
CREATE OR REPLACE FUNCTION handle_invitation_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Security check: Ensure critical fields haven't been tampered with
  IF NEW.group_id != OLD.group_id OR 
     NEW.invited_user_id != OLD.invited_user_id OR 
     NEW.invited_by != OLD.invited_by THEN
    RAISE EXCEPTION 'Cannot modify group_id, invited_user_id, or invited_by fields';
  END IF;

  -- Proceed if status changed to 'accepted' from any other status
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Use OLD.group_id to prevent any potential tampering
    -- Add user to group_members if not already a member
    INSERT INTO group_members (group_id, user_id)
    VALUES (OLD.group_id, OLD.invited_user_id)
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a BEFORE UPDATE trigger to prevent invited users from modifying protected fields
CREATE OR REPLACE FUNCTION prevent_invitation_tampering()
RETURNS TRIGGER AS $$
DECLARE
  is_group_creator BOOLEAN;
BEGIN
  -- Check if the user is the group creator
  SELECT EXISTS(
    SELECT 1 FROM groups 
    WHERE id = OLD.group_id 
    AND created_by = auth.uid()
  ) INTO is_group_creator;

  -- If user is the group creator, allow all updates
  IF is_group_creator THEN
    RETURN NEW;
  END IF;

  -- If user is the invited user (not creator), only allow status changes
  IF auth.uid() = OLD.invited_user_id THEN
    -- Prevent modification of protected fields
    IF NEW.group_id != OLD.group_id OR 
       NEW.invited_user_id != OLD.invited_user_id OR 
       NEW.invited_by != OLD.invited_by THEN
      RAISE EXCEPTION 'Invited users can only update the status field';
    END IF;
    RETURN NEW;
  END IF;

  -- If user is neither creator nor invited user, deny update
  RAISE EXCEPTION 'Unauthorized to update this invitation';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the trigger before updates
DROP TRIGGER IF EXISTS check_invitation_tampering ON group_invitations;
CREATE TRIGGER check_invitation_tampering
  BEFORE UPDATE ON group_invitations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_invitation_tampering();

-- Keep the existing RLS policy for basic access control
DROP POLICY IF EXISTS "Invited users can update their invitations" ON group_invitations;

CREATE POLICY "Invited users can update their invitations" ON group_invitations
  FOR UPDATE USING (
    auth.uid() = invited_user_id OR
    auth.uid() IN (SELECT created_by FROM groups WHERE groups.id = group_invitations.group_id)
  );
