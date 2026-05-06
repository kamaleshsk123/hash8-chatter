import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, Pin, PinOff } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  onTogglePin?: (messageId: string, isPinned: boolean) => void;
}

export const DirectMessageHeader: React.FC<DirectMessageHeaderProps> = ({
  otherUser,
  onClearChat,
  messages = [],
  onTogglePin
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
        {onTogglePin && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Pin className="h-4 w-4" />
                {messages.filter(m => m.isPinned).length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground shadow-sm">
                    {messages.filter(m => m.isPinned).length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Pinned Messages</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                {messages.filter(m => m.isPinned).length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {messages
                      .filter(m => m.isPinned)
                      .sort((a, b) => {
                        const timeA = a.pinnedAt instanceof Date ? a.pinnedAt.getTime() : (a.pinnedAt as any)?.toDate?.()?.getTime() || 0;
                        const timeB = b.pinnedAt instanceof Date ? b.pinnedAt.getTime() : (b.pinnedAt as any)?.toDate?.()?.getTime() || 0;
                        return timeB - timeA;
                      })
                      .map(msg => (
                        <div
                          key={msg.id}
                          className="p-3 bg-muted rounded-lg border border-border/50 group relative cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => {
                            const el = document.getElementById(`msg-${msg.id}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={msg.senderAvatar} />
                              <AvatarFallback className="text-[8px] bg-primary/10">
                                {msg.senderName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] font-medium">{msg.senderName}</span>
                            <span className="text-[9px] text-muted-foreground ml-auto">
                              {(msg.pinnedAt instanceof Date ? msg.pinnedAt : (msg.pinnedAt as any)?.toDate?.())?.toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs line-clamp-3">{msg.text}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePin(msg.id, false);
                            }}
                          >
                            <PinOff className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Pin className="w-6 h-6 text-muted-foreground opacity-20" />
                    </div>
                    <p className="text-sm text-muted-foreground italic">No pinned messages yet.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Pin important messages to find them easily.</p>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
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
