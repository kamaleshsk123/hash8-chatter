import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, Pin, PinOff } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";


interface DirectMessageHeaderProps {
  otherUser: {
    name: string;
    avatar: string;
    role?: string;
  };
  onClearChat?: () => void; // optional callback to clear chat
  messages?: any[];
  onTogglePinnedSidebar?: () => void;
}

export const DirectMessageHeader: React.FC<DirectMessageHeaderProps> = ({
  otherUser,
  onClearChat,
  messages = [],
  onTogglePinnedSidebar
}) => {
  const [showClearDialog, setShowClearDialog] = useState(false);

  return (
    <div className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-3 flex-1">
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherUser.avatar} alt={otherUser.name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {otherUser.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{otherUser.name}</h3>
          {otherUser.role && (
            <p className="text-xs text-muted-foreground">{otherUser.role}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onTogglePinnedSidebar && (
          <Button variant="ghost" size="icon" className="relative" onClick={onTogglePinnedSidebar}>
            <Pin className="h-4 w-4" />
            {messages.filter(m => m.isPinned).length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground shadow-sm">
                {messages.filter(m => m.isPinned).length}
              </span>
            )}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setShowClearDialog(true)}>
              Clear Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Clear Chat</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all messages in this conversation. They can be recovered within 6 months.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (onClearChat) onClearChat();
                  setShowClearDialog(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
