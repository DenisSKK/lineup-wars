-- Migration: Update remove member function to also delete invitation records
-- Created: 2025-12-14

-- Update the function to remove invitation records when removing a member
-- This allows the user to be invited again after being removed
CREATE OR REPLACE FUNCTION remove_group_member(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_group_owner UUID;
  v_caller_id UUID;
BEGIN
  -- Get the current authenticated user
  v_caller_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get the group owner
  SELECT created_by INTO v_group_owner
  FROM groups
  WHERE id = p_group_id;
  
  -- Check if group exists
  IF v_group_owner IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Group not found');
  END IF;
  
  -- Check if caller is the group owner
  IF v_caller_id != v_group_owner THEN
    RETURN json_build_object('success', false, 'error', 'Only the group owner can remove members');
  END IF;
  
  -- Check if trying to remove themselves
  IF p_user_id = v_group_owner THEN
    RETURN json_build_object('success', false, 'error', 'Owner cannot remove themselves from the group');
  END IF;
  
  -- Check if the user is actually a member
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'User is not a member of this group');
  END IF;
  
  -- Remove the member
  DELETE FROM group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;
  
  -- Delete any invitation records for this user and group
  -- This allows the user to be invited again in the future
  DELETE FROM group_invitations
  WHERE group_id = p_group_id AND invited_user_id = p_user_id;
  
  RETURN json_build_object('success', true, 'message', 'Member removed successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
