import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Message } from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface ChatBubbleProps {
  message: Message;
  isConsecutive?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isConsecutive = false,
}) => {
  const { user } = useAuth();
  const isOwnMessage = message.senderId === user?.uid;

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

        <div
          className={cn(
            "relative px-4 py-2.5 rounded-2xl shadow-message",
            "max-w-full break-words",
            isOwnMessage
              ? "bg-chat-bubble-sent text-chat-bubble-sent-foreground"
              : "bg-chat-bubble-received text-chat-bubble-received-foreground",
            isOwnMessage ? "rounded-br-md" : "rounded-bl-md"
          )}>
          <p className="text-sm leading-relaxed">{message.text}</p>

          <div
            className={cn(
              "flex items-center gap-1 mt-1 text-xs opacity-70",
              isOwnMessage ? "justify-end" : "justify-start"
            )}>
            <span>
              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
