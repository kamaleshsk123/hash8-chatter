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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MoreVertical, Trash2, Flag, Shield } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { deleteMessageAsModerator } from '@/services/firebase';
import { useToast } from '@/hooks/use-toast';
import { UserRole, Message } from '@/types';

interface MessageModerationMenuProps {
  message: Message;
  currentUserRole: UserRole;
  currentUserId: string;
  currentUserName: string;
  organizationId: string;
  groupId: string;
  onMessageDeleted?: () => void;
}

export const MessageModerationMenu: React.FC<MessageModerationMenuProps> = ({
  message,
  currentUserRole,
  currentUserId,
  currentUserName,
  organizationId,
  groupId,
  onMessageDeleted,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const permissions = usePermissions(currentUserRole);
  const { toast } = useToast();

  const isOwnMessage = message.senderId === currentUserId;
  const canDeleteMessage = permissions.canDeleteMessages && !isOwnMessage;

  const handleDeleteMessage = async () => {
    if (!deleteReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for deleting this message.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteMessageAsModerator(
        organizationId,
        groupId,
        message.id,
        currentUserId,
        currentUserName,
        deleteReason.trim()
      );
      
      toast({
        title: 'Message Deleted',
        description: 'The message has been deleted successfully.',
      });
      
      onMessageDeleted?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete message.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeleteReason('');
    }
  };

  // Don't show menu if user has no moderation permissions or it's their own message
  if (!canDeleteMessage) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Message
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <Flag className="w-4 h-4 mr-2" />
            Report Message
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              Delete Message
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete a message from <strong>{message.senderName}</strong>. 
              This action cannot be undone and will be logged for audit purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Message content:</p>
              <p className="text-sm">{message.text}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delete-reason">Reason for deletion *</Label>
              <Textarea
                id="delete-reason"
                placeholder="Please provide a reason for deleting this message..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMessage}
              disabled={isDeleting || !deleteReason.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Message'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};