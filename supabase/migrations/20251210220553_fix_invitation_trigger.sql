-- Fix invitation accepted trigger to work with 'requested' status
-- Migration created: 2025-12-10

-- Update function to handle acceptance from any status (pending or requested)
CREATE OR REPLACE FUNCTION handle_invitation_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Proceed if status changed to 'accepted' from any other status
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Add user to group_members if not already a member
    INSERT INTO group_members (group_id, user_id)
    VALUES (NEW.group_id, NEW.invited_user_id)
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
