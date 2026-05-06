import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Message, UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { MessageReadReceipts } from "@/components/MessageReadReceipts";
import { MessageModerationMenu } from "@/components/moderation/MessageModerationMenu";
import { Clock, Wifi, WifiOff } from "lucide-react";

interface ChatBubbleProps {
  message: Message;
  isConsecutive?: boolean;
  currentUserRole?: UserRole;
  organizationId?: string;
  groupId?: string;
  onMessageDeleted?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isConsecutive = false,
  currentUserRole,
  organizationId,
  groupId,
  onMessageDeleted,
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
              <p className="text-sm italic text-muted-foreground">
                This message was deleted by a moderator
              </p>
            ) : (
              <p className="text-sm leading-relaxed">{message.text}</p>
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

          {/* Moderation Menu - only show if not deleted and user has permissions */}
          {!message.deleted && currentUserRole && organizationId && groupId && (
            <div className={cn(
              "absolute top-2",
              isOwnMessage ? "left-2" : "right-2"
            )}>
              <MessageModerationMenu
                message={message}
                currentUserRole={currentUserRole}
                currentUserId={user?.uid || ''}
                currentUserName={user?.name || user?.email || 'Unknown'}
                organizationId={organizationId}
                groupId={groupId}
                onMessageDeleted={onMessageDeleted}
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
