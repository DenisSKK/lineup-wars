-- Add group invitations table
-- Migration created: 2025-12-10

-- Create group_invitations table
CREATE TABLE IF NOT EXISTS group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, invited_user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invited_user_id ON group_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON group_invitations(status);

-- Enable RLS
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_invitations

-- Group creators and invited users can view invitations
CREATE POLICY "Users can view invitations for their groups or to them" ON group_invitations
  FOR SELECT USING (
    auth.uid() = invited_user_id OR 
    auth.uid() IN (SELECT created_by FROM groups WHERE groups.id = group_invitations.group_id)
  );

-- Group creators can create invitations
CREATE POLICY "Group creators can invite users" ON group_invitations
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT created_by FROM groups WHERE groups.id = group_invitations.group_id)
  );

-- Invited users can update their own invitations (accept/decline)
CREATE POLICY "Invited users can update their invitations" ON group_invitations
  FOR UPDATE USING (auth.uid() = invited_user_id);

-- Group creators can delete pending invitations
CREATE POLICY "Group creators can delete invitations" ON group_invitations
  FOR DELETE USING (
    auth.uid() IN (SELECT created_by FROM groups WHERE groups.id = group_invitations.group_id)
  );

-- Trigger for updated_at
CREATE TRIGGER update_group_invitations_updated_at BEFORE UPDATE ON group_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically add user to group when invitation is accepted
CREATE OR REPLACE FUNCTION handle_invitation_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Add user to group_members if not already a member
    INSERT INTO group_members (group_id, user_id)
    VALUES (NEW.group_id, NEW.invited_user_id)
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add user to group when invitation is accepted
DROP TRIGGER IF EXISTS on_invitation_accepted ON group_invitations;
CREATE TRIGGER on_invitation_accepted
  AFTER UPDATE ON group_invitations
  FOR EACH ROW EXECUTE FUNCTION handle_invitation_accepted();
