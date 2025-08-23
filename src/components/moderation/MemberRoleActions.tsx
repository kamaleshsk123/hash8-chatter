import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield, ShieldCheck, UserMinus, MoreVertical, Crown, Trash2 } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { promoteToModerator, demoteFromModerator } from '@/services/firebase';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types';

interface MemberRoleActionsProps {
  member: {
    userId: string;
    role: UserRole;
    displayName?: string;
    name?: string;
    email?: string;
  };
  currentUserRole: UserRole;
  currentUserId: string;
  currentUserName: string;
  organizationId: string;
  onRoleChange?: () => void;
  onRemoveMember?: (member: any) => void;
  showRemoveAction?: boolean;
}

export const MemberRoleActions: React.FC<MemberRoleActionsProps> = ({
  member,
  currentUserRole,
  currentUserId,
  currentUserName,
  organizationId,
  onRoleChange,
  onRemoveMember,
  showRemoveAction = false,
}) => {
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showDemoteDialog, setShowDemoteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const permissions = usePermissions(currentUserRole);
  const { toast } = useToast();

  const memberName = member.displayName || member.name || member.email || 'Unknown User';
  const isCurrentUser = member.userId === currentUserId;
  const canPromote = permissions.canPromoteToModerator && member.role === 'member' && !isCurrentUser;
  const canDemote = permissions.canDemoteFromModerator && member.role === 'moderator' && !isCurrentUser;

  const handlePromoteToModerator = async () => {
    setIsLoading(true);
    try {
      await promoteToModerator(member.userId, organizationId, currentUserId, currentUserName);
      toast({
        title: 'Success',
        description: `${memberName} has been promoted to moderator.`,
      });
      onRoleChange?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to promote user to moderator.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setShowPromoteDialog(false);
    }
  };

  const handleDemoteFromModerator = async () => {
    setIsLoading(true);
    try {
      await demoteFromModerator(member.userId, organizationId, currentUserId, currentUserName);
      toast({
        title: 'Success',
        description: `${memberName} has been demoted to member.`,
      });
      onRoleChange?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to demote user from moderator.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setShowDemoteDialog(false);
    }
  };

  // Check if we have any actions to show
  const hasRoleActions = (canPromote || canDemote) && member.role !== 'admin';
  const hasRemoveAction = showRemoveAction && !isCurrentUser && member.role !== 'admin';
  
  // Don't show menu if no actions are available
  if (!hasRoleActions && !hasRemoveAction) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canPromote && (
            <DropdownMenuItem onClick={() => setShowPromoteDialog(true)}>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Promote to Moderator
            </DropdownMenuItem>
          )}
          {canDemote && (
            <DropdownMenuItem onClick={() => setShowDemoteDialog(true)}>
              <UserMinus className="w-4 h-4 mr-2" />
              Demote to Member
            </DropdownMenuItem>
          )}
          {(canPromote || canDemote) && hasRemoveAction && (
            <DropdownMenuSeparator />
          )}
          {hasRemoveAction && (
            <DropdownMenuItem 
              onClick={() => onRemoveMember?.(member)}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Member
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Promote Dialog */}
      <AlertDialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Moderator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to promote <strong>{memberName}</strong> to moderator? 
              They will gain the ability to:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Delete messages</li>
                <li>Ban users</li>
                <li>Manage groups</li>
                <li>Access moderation tools</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePromoteToModerator}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? 'Promoting...' : 'Promote to Moderator'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Demote Dialog */}
      <AlertDialog open={showDemoteDialog} onOpenChange={setShowDemoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demote from Moderator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to demote <strong>{memberName}</strong> from moderator to member? 
              They will lose all moderator privileges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDemoteFromModerator}
              disabled={isLoading}
              variant="destructive"
            >
              {isLoading ? 'Demoting...' : 'Demote to Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};