import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MessageSquare, 
  Send,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatBubble } from "@/components/ChatBubble";
import { Message } from "@/types";
import { 
  subscribeToGroupMessages, 
  sendGroupMessage,
  subscribeToDirectMessages,
  sendDirectMessage 
} from "@/services/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ThreadViewProps {
  parentMessage: Message;
  orgId?: string;
  groupId?: string; // or conversationId for DMs
  isDM?: boolean;
  onClose: () => void;
}

export const ThreadView: React.FC<ThreadViewProps> = ({
  parentMessage,
  orgId,
  groupId,
  isDM,
  onClose
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [replies, setReplies] = useState<Message[]>([]);
  const [newReply, setNewReply] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) return;

    let unsubscribe: () => void;

    if (isDM) {
      unsubscribe = subscribeToDirectMessages(groupId, (messages) => {
        const threadReplies = messages.filter(m => m.parentMessageId === parentMessage.id);
        setReplies(threadReplies);
      });
    } else if (orgId) {
      unsubscribe = subscribeToGroupMessages(orgId, groupId, (messages) => {
        const threadReplies = messages.filter(m => m.parentMessageId === parentMessage.id);
        setReplies(threadReplies);
      });
    }

    return () => unsubscribe?.();
  }, [groupId, orgId, isDM, parentMessage.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replies]);

  const handleSendReply = async () => {
    if (!newReply.trim() || !user || isSending || !groupId) return;

    setIsSending(true);
    try {
      if (isDM) {
        await sendDirectMessage(groupId, {
          text: newReply.trim(),
          senderId: user.uid,
          senderName: user.name || 'User',
          senderAvatar: user.avatar,
          parentMessageId: parentMessage.id
        });
      } else if (orgId) {
        await sendGroupMessage(orgId, groupId, {
          text: newReply.trim(),
          senderId: user.uid,
          senderName: user.name || 'User',
          senderAvatar: user.avatar,
          parentMessageId: parentMessage.id
        });
      }
      setNewReply('');
    } catch (error) {
      console.error("Failed to send reply:", error);
      toast({ title: "Error", description: "Failed to send reply.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-l shadow-xl w-full sm:w-[400px] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Thread</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {/* Parent Message */}
        <div className="mb-6 pb-6 border-b">
          <ChatBubble
            message={parentMessage}
            isThreadParent={true}
          />
        </div>

        {/* Replies */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </p>
          {replies.map((reply) => (
            <ChatBubble
              key={reply.id}
              message={reply}
            />
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Input
              placeholder="Reply to thread..."
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
              className="pr-10"
              disabled={isSending}
            />
          </div>
          <Button 
            size="icon" 
            disabled={!newReply.trim() || isSending}
            onClick={handleSendReply}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
