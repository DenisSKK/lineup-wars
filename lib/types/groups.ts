// Group invitation types
export interface GroupInvitation {
  id: string
  group_id: string
  invited_user_id: string
  invited_by: string
  status: 'pending' | 'accepted' | 'declined' | 'requested'
  created_at: string
  updated_at: string
}

export interface GroupInvitationWithDetails extends GroupInvitation {
  group: {
    id: string
    name: string
    description: string | null
    created_by: string
  }
  inviter: {
    email: string
    full_name: string | null
  }
}

export interface JoinRequest {
  id: string
  invited_user_id: string
  created_at: string
  profile: {
    email: string
    full_name: string | null
  }
}

export interface PendingInvitation {
  id: string
  invited_user_id: string
  status: string
  created_at: string
  profile: {
    email: string
    full_name: string | null
  }
}

export interface DeclinedInvitation {
  id: string
  group_id: string
  invited_user_id: string
  invited_by: string
  status: string
  created_at: string
  updated_at: string
  group: {
    id: string
    name: string
    description: string | null
  }
}
