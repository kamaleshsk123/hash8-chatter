import React from 'react';
import { X, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface PinnedMessagesSidebarProps {
  messages: any[];
  onClose: () => void;
  onTogglePin?: (messageId: string, isPinned: boolean) => void;
  onMessageClick?: (messageId: string) => void;
}

export const PinnedMessagesSidebar: React.FC<PinnedMessagesSidebarProps> = ({
  messages,
  onClose,
  onTogglePin,
  onMessageClick
}) => {
  const pinnedMessages = messages
    .filter(m => m.isPinned)
    .sort((a, b) => {
      const timeA = a.pinnedAt instanceof Date ? a.pinnedAt.getTime() : (a.pinnedAt as any)?.toDate?.()?.getTime() || 0;
      const timeB = b.pinnedAt instanceof Date ? b.pinnedAt.getTime() : (b.pinnedAt as any)?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });

  return (
    <div className="flex flex-col h-full bg-background border-l shadow-xl w-full sm:w-[400px] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Pin className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Pinned Messages</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {pinnedMessages.length > 0 ? (
          <div className="space-y-4">
            {pinnedMessages.map((msg) => (
              <div
                key={msg.id}
                className="group relative p-3 bg-muted/40 hover:bg-muted/60 rounded-xl border border-border/50 transition-colors cursor-pointer"
                onClick={() => onMessageClick?.(msg.id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={msg.senderAvatar} />
                    <AvatarFallback className="text-[10px] bg-primary/10">
                      {msg.senderName?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-foreground">{msg.senderName}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {msg.timestamp ? formatDistanceToNow(
                      msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp as any)?.toDate?.() || new Date(), 
                      { addSuffix: true }
                    ) : ''}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 pl-7">
                  {msg.text || "Document/File"}
                </p>
                {onTogglePin && (
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
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center h-full">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Pin className="w-6 h-6 text-muted-foreground opacity-20" />
            </div>
            <p className="text-sm text-muted-foreground italic">No pinned messages yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Pin important messages to find them easily.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
