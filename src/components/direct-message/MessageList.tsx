import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Reply, 
  Paperclip, 
  Check, 
  CheckCheck, 
  Clock, 
  Pin, 
  PinOff,
  MessageSquare
} from "lucide-react";
import { MessageReactions } from "@/components/MessageReactions";
import { ReplyToMessage } from "@/components/ReplyToMessage";
import { EmojiPickerComponent } from "@/components/EmojiPicker";
import { formatChatDate, isSameDay } from "@/utils/dateUtils";
import { PollBubble } from "@/components/PollBubble";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'audio' | 'document' | 'poll';
  pollData?: {
    question: string;
    options: { id: string; text: string; userIds: string[] }[];
    allowMultipleAnswers: boolean;
  };
  readBy: Array<{
    userId: string;
    userName: string;
    userAvatar: string;
    readAt: Date;
  }>;
  isRead: boolean;
  reactions?: Record<string, Array<{
    userId: string;
    userName: string;
    timestamp: Date;
  }>>;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  filePath?: string;
  isEdited?: boolean;
  editedAt?: Date;
  replyTo?: {
    messageId: string;
    text: string;
    senderName: string;
  };
  deleted?: boolean;
  hasPendingWrites?: boolean; // Added for offline support
  isCleared?: boolean;
  clearedAt?: Date;
  isPinned?: boolean;
  parentMessageId?: string;
  replyCount?: number;
}

interface MessageListProps {
  messages: Message[];
  conversationId: string;
  user: any;
  otherUser: any;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messageRefs: React.MutableRefObject<Record<string, HTMLDivElement>>;
  handleEditMessage: (message: Message) => void;
  handleDeleteMessage: (messageId: string) => void;
  handleReplyToMessage: (message: Message) => void;
  handleReaction: (messageId: string, emoji: string) => void;
  handleReplyClick: (messageId: string) => void;
  handleTogglePin: (messageId: string, isPinned: boolean) => void;
  onOpenThread?: (message: Message) => void;
  onViewVoters?: (message: Message) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  conversationId,
  user,
  otherUser,
  isLoading,
  messagesEndRef,
  messageRefs,
  handleEditMessage,
  handleDeleteMessage,
  handleReplyToMessage,
  handleReaction,
  handleReplyClick,
  handleTogglePin,
  onOpenThread,
  onViewVoters,
}) => {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="min-h-full flex flex-col justify-end">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="text-sm text-muted-foreground mb-2">
              No messages yet
            </div>
            <div className="text-xs text-muted-foreground">
              Start a conversation with {otherUser.name}
            </div>
            {/* Show offline indicator if applicable */}
            {typeof window !== 'undefined' && !navigator.onLine && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                Messages will sync when online
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const filteredMessages = messages.filter(msg => !msg.isCleared);
              const groups: { date: string; msgs: Message[] }[] = [];
              
              filteredMessages.forEach(msg => {
                const dateStr = formatChatDate(msg.timestamp);
                const lastGroup = groups[groups.length - 1];
                if (lastGroup && lastGroup.date === dateStr) {
                  lastGroup.msgs.push(msg);
                } else {
                  groups.push({ date: dateStr, msgs: [msg] });
                }
              });

              return groups.map((group) => (
                <div key={group.date} className="space-y-4">
                  <div className="flex justify-center my-6 sticky top-2 z-10">
                    <div className="bg-muted/80 backdrop-blur-sm text-muted-foreground text-[11px] font-medium px-3 py-1 rounded-full shadow-sm border border-border/50">
                      {group.date}
                    </div>
                  </div>
                  {group.msgs.map((message, msgIndex) => {
                    const isOwnMessage = message.senderId === user?.uid;
                    const isConsecutive = msgIndex > 0 && group.msgs[msgIndex - 1].senderId === message.senderId;
                    
                    return (
                      <div
                        key={message.id}
                        id={`msg-${message.id}`}
                        ref={(el) => {
                          if (el) messageRefs.current[message.id] = el;
                        }}
                        className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} ${isConsecutive ? 'mt-1' : 'mt-4'}`}
                      >
                        {!isOwnMessage && !isConsecutive && (
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {message.senderName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!isOwnMessage && isConsecutive && <div className="h-8 w-8" />}
                        
                        <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} group`}>
                          {message.replyTo && (
                            <ReplyToMessage
                              senderName={message.replyTo.senderName}
                              text={message.replyTo.text}
                              isOwnMessage={isOwnMessage}
                              onClick={() => handleReplyClick(message.replyTo.messageId)}
                            />
                          )}
                          
                          <div className="relative">
                            <div
                              className={cn(
                                "rounded-lg px-3 py-2",
                                isOwnMessage
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground'
                              )}
                            >
                              {message.isPinned && (
                                <div className="flex items-center gap-1 text-[10px] opacity-70 mb-1 border-b border-white/20 pb-1">
                                  <Pin className="w-3 h-3 fill-current" />
                                  <span>Pinned Message</span>
                                </div>
                              )}
                              {message.fileUrl && (
                                <div className="mb-2">
                                  {message.type === 'image' ? (
                                    <img 
                                      src={message.fileUrl} 
                                      alt={message.fileName} 
                                      className="max-w-xs rounded cursor-pointer"
                                      onClick={() => window.open(message.fileUrl, '_blank')}
                                    />
                                  ) : message.type === 'audio' ? (
                                    <div className="flex items-center gap-2 p-2 bg-background/10 rounded">
                                      <audio controls className="max-w-xs" preload="auto" crossOrigin="anonymous">
                                        <source src={message.fileUrl} type="audio/webm" />
                                        <source src={message.fileUrl} type="audio/wav" />
                                        <source src={message.fileUrl} type="audio/ogg" />
                                        <source src={message.fileUrl} type="audio/mp3" />
                                        <source src={message.fileUrl} type="audio/mpeg" />
                                        Your browser does not support the audio element.
                                      </audio>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 p-2 bg-background/10 rounded cursor-pointer"
                                         onClick={() => window.open(message.fileUrl, '_blank')}>
                                      <Paperclip className="h-4 w-4" />
                                      <span className="text-sm">{message.fileName}</span>
                                      <span className="text-xs opacity-70">({Math.round((message.fileSize || 0) / 1024)} KB)</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {(!message.deleted && message.type === 'poll' && message.pollData) ? (
                                <PollBubble 
                                  message={message as any} 
                                  groupId={conversationId}
                                  isOwnMessage={isOwnMessage}
                                  onViewVoters={() => onViewVoters?.(message as any)}
                                />
                              ) : (message.text || (!message.fileUrl && !message.text)) && (
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.deleted ? (
                                    <span className={cn(
                                      "italic",
                                      isOwnMessage ? "text-white/70" : "text-muted-foreground/80"
                                    )}>
                                      This message has been deleted
                                    </span>
                                  ) : (
                                    <>
                                      {message.text || "Document"}
                                      {message.isEdited && <span className="text-xs opacity-70 ml-1">(edited)</span>}
                                    </>
                                  )}
                                </p>
                              )}
                            </div>
    
                            {message.replyCount && message.replyCount > 0 ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 mt-1 text-[10px] text-primary hover:text-primary/80 bg-primary/5 rounded-full"
                                onClick={() => onOpenThread?.(message)}
                              >
                                <MessageSquare className="w-3 h-3 mr-1" />
                                {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
                              </Button>
                            ) : null}
                            
                            {!message.deleted && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className={`absolute ${isOwnMessage ? '-left-8' : '-right-8'} top-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity p-1 h-6 w-6`}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {isOwnMessage && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleEditMessage(message)}>
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteMessage(message.id)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem onClick={() => handleReplyToMessage(message)}>
                                    <Reply className="h-4 w-4 mr-2" />
                                    Reply
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onOpenThread?.(message)}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Reply in Thread
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleTogglePin(message.id, !message.isPinned)}>
                                    {message.isPinned ? (
                                      <>
                                        <PinOff className="h-4 w-4 mr-2" />
                                        Unpin
                                      </>
                                    ) : (
                                      <>
                                        <Pin className="h-4 w-4 mr-2" />
                                        Pin
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <EmojiPickerComponent onEmojiSelect={(emoji) => handleReaction(message.id, emoji)} />
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          
                          <MessageReactions 
                            reactions={message.reactions || {}}
                            currentUserId={user?.uid || ''}
                            onReactionClick={(emoji) => handleReaction(message.id, emoji)}
                          />
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <span>
                              {message.timestamp.toLocaleTimeString([], { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                            {isOwnMessage && (
                              <div className="flex items-center">
                                {message.hasPendingWrites ? (
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                ) : message.readBy.some(receipt => receipt.userId === otherUser.userId) ? (
                                  <CheckCheck className="h-3 w-3 text-blue-500" />
                                ) : (
                                  <Check className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </ScrollArea>
  );
};