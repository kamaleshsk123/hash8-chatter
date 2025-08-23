import { UserRole } from '@/types';

export interface Permissions {
  // Message permissions
  canDeleteMessages: boolean;
  canEditMessages: boolean;
  canPinMessages: boolean;
  
  // Member permissions
  canBanUsers: boolean;
  canWarnUsers: boolean;
  canViewMemberDetails: boolean;
  canManageMembers: boolean;
  
  // Group permissions
  canCreateGroups: boolean;
  canDeleteGroups: boolean;
  canManageGroups: boolean;
  
  // Organization permissions
  canPromoteToModerator: boolean;
  canDemoteFromModerator: boolean;
  canEditOrganization: boolean;
  canViewModerationLogs: boolean;
  canManageOrganization: boolean;
  
  // Moderation permissions
  canViewReports: boolean;
  canResolveReports: boolean;
  canAccessModerationDashboard: boolean;
}

export const usePermissions = (userRole: UserRole | null): Permissions => {
  if (!userRole) {
    // No role - no permissions
    return {
      canDeleteMessages: false,
      canEditMessages: false,
      canPinMessages: false,
      canBanUsers: false,
      canWarnUsers: false,
      canViewMemberDetails: false,
      canManageMembers: false,
      canCreateGroups: false,
      canDeleteGroups: false,
      canManageGroups: false,
      canPromoteToModerator: false,
      canDemoteFromModerator: false,
      canEditOrganization: false,
      canViewModerationLogs: false,
      canManageOrganization: false,
      canViewReports: false,
      canResolveReports: false,
      canAccessModerationDashboard: false,
    };
  }

  const isAdmin = userRole === 'admin';
  const isModerator = userRole === 'moderator';
  const isModeratorOrAdmin = isAdmin || isModerator;

  return {
    // Message permissions
    canDeleteMessages: isModeratorOrAdmin,
    canEditMessages: false, // Reserved for message authors
    canPinMessages: isModeratorOrAdmin,
    
    // Member permissions
    canBanUsers: isModeratorOrAdmin,
    canWarnUsers: isModeratorOrAdmin,
    canViewMemberDetails: isModeratorOrAdmin,
    canManageMembers: isAdmin, // Only admins can add/remove members
    
    // Group permissions
    canCreateGroups: true, // All members can create groups
    canDeleteGroups: isModeratorOrAdmin,
    canManageGroups: isModeratorOrAdmin,
    
    // Organization permissions (Admin only)
    canPromoteToModerator: isAdmin,
    canDemoteFromModerator: isAdmin,
    canEditOrganization: isAdmin,
    canViewModerationLogs: isAdmin,
    canManageOrganization: isAdmin,
    
    // Moderation permissions
    canViewReports: isModeratorOrAdmin,
    canResolveReports: isModeratorOrAdmin,
    canAccessModerationDashboard: isModeratorOrAdmin,
  };
};

export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'moderator':
      return 'Moderator';
    case 'member':
      return 'Member';
    default:
      return 'Member';
  }
};

export const getRolePriority = (role: UserRole): number => {
  switch (role) {
    case 'admin':
      return 1;
    case 'moderator':
      return 2;
    case 'member':
      return 3;
    default:
      return 3;
  }
};