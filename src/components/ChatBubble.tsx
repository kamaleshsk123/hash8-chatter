import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Message, UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { MessageReadReceipts } from "@/components/MessageReadReceipts";
import { MessageModerationMenu } from "@/components/moderation/MessageModerationMenu";
import { Clock, Wifi, WifiOff, Pin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PollBubble } from "./PollBubble";

interface ChatBubbleProps {
  message: Message;
  isConsecutive?: boolean;
  currentUserRole?: UserRole;
  organizationId?: string;
  groupId?: string;
  onMessageDeleted?: () => void;
  onTogglePin?: (messageId: string, isPinned: boolean) => void;
  onEditMessage?: (message: Message) => void;
  onReply?: (message: Message) => void;
  isThreadParent?: boolean;
  onViewVoters?: (message: Message) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isConsecutive = false,
  currentUserRole,
  organizationId,
  groupId,
  onMessageDeleted,
  onTogglePin,
  onEditMessage,
  onReply,
  isThreadParent = false,
  onViewVoters,
}) => {
  const { user } = useAuth();
  const isOwnMessage = message.senderId === user?.uid;

  if (message.type === "system") {
    return (
      <div className="flex justify-center w-full my-2">
        <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full italic max-w-[80%] text-center">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex gap-3 px-4 py-2 w-full",
        isOwnMessage ? "justify-end" : "justify-start",
        isConsecutive && "pt-1"
      )}>
      {!isOwnMessage && !isConsecutive && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarImage src={message.senderAvatar} alt={message.senderName} />
          <AvatarFallback className="text-xs bg-primary/10">
            {message.senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      {!isOwnMessage && isConsecutive && <div className="w-8" />}

      <div
        className={cn(
          "flex flex-col w-full max-w-[70%] sm:max-w-[60%] md:max-w-[50%]",
          isOwnMessage ? "items-end" : "items-start"
        )}>
        {!isOwnMessage && !isConsecutive && (
          <span className="text-xs text-muted-foreground mb-1 px-3">
            {message.senderName}
          </span>
        )}

        <div className="group relative">
          <div
            className={cn(
              "relative px-4 py-2.5 rounded-2xl shadow-message",
              "max-w-full break-words",
              isOwnMessage
                ? "bg-chat-bubble-sent text-chat-bubble-sent-foreground"
                : "bg-chat-bubble-received text-chat-bubble-received-foreground",
              isOwnMessage ? "rounded-br-md" : "rounded-bl-md"
            )}>
            {/* Show deleted message indicator */}
            {message.deleted ? (
              <p className={cn(
                "text-sm italic",
                isOwnMessage ? "text-white/70" : "text-muted-foreground/80"
              )}>
                This message was deleted
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {!isThreadParent && message.isPinned && (
                  <div className="flex items-center gap-1 text-[10px] opacity-70 mb-1">
                    <Pin className="w-3 h-3 fill-current" />
                    <span>Pinned</span>
                  </div>
                )}
                
                {message.pollData ? (
                  <PollBubble 
                    message={message} 
                    organizationId={organizationId} 
                    groupId={groupId} 
                    isOwnMessage={isOwnMessage}
                    onViewVoters={() => onViewVoters?.(message)}
                  />
                ) : (
                  <p className="text-sm leading-relaxed">
                    {message.text}
                    {message.isEdited && (
                      <span className="text-[10px] opacity-50 ml-1 italic font-normal">
                        (edited)
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}

            <div
              className={cn(
                "flex items-center gap-1 mt-1 text-xs opacity-70",
                isOwnMessage ? "justify-end" : "justify-start"
              )}>
              <span>
                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
              </span>
              
              {/* Pending writes indicator */}
              {message.hasPendingWrites && (
                <div className="flex items-center gap-1 ml-2">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] opacity-60">Sending...</span>
                </div>
              )}
            </div>
          </div>

          {/* Reply Count Indicator */}
          {!isThreadParent && !message.deleted && message.replyCount && message.replyCount > 0 ? (
            <div className={cn("flex mt-1", isOwnMessage ? "justify-end mr-2" : "justify-start ml-2")}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-[10px] text-primary hover:text-primary/80 bg-primary/10 rounded-full"
                onClick={() => onReply?.(message)}
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
              </Button>
            </div>
          ) : null}

          {/* Moderation Menu - only show if not deleted and user has permissions */}
          {!message.deleted && currentUserRole && organizationId && groupId && (
            <div className={cn(
              "absolute top-1",
              isOwnMessage ? "-left-7" : "-right-7"
            )}>
              <MessageModerationMenu
                message={message}
                currentUserRole={currentUserRole}
                currentUserId={user?.uid || ''}
                currentUserName={user?.name || user?.email || 'Unknown'}
                organizationId={organizationId}
                groupId={groupId}
                onMessageDeleted={onMessageDeleted}
                onTogglePin={onTogglePin}
                onEditMessage={onEditMessage}
                onReply={onReply}
              />
            </div>
          )}
        </div>
        
        {/* Read receipts - only show for own messages */}
        {isOwnMessage && (
          <MessageReadReceipts
            readBy={message.readBy}
            currentUserId={user?.uid || ""}
            isOwnMessage={isOwnMessage}
            className="mr-2 mt-1"
          />
        )}
      </div>
    </motion.div>
  );
};
