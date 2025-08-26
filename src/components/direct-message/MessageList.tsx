import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit2, Trash2, Reply, Paperclip, Check, CheckCheck, Clock } from "lucide-react";
import { MessageReactions } from "@/components/MessageReactions";
import { ReplyToMessage } from "@/components/ReplyToMessage";
import { EmojiPickerComponent } from "@/components/EmojiPicker";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'audio' | 'document';
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
}

interface MessageListProps {
  messages: Message[];
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
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
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
}) => {
  return (
    <ScrollArea className="flex-1 p-4">
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
          {messages.map((message) => {
            const isOwnMessage = message.senderId === user?.uid;
            
            return (
              <div
                key={message.id}
                ref={(el) => {
                  if (el) messageRefs.current[message.id] = el;
                }}
                className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isOwnMessage && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {message.senderName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                
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
                      className={`rounded-lg px-3 py-2 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
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
                      
                      {(message.text || (!message.fileUrl && !message.text)) && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.deleted ? (
                            <span className="text-muted-foreground italic">This message has been deleted</span>
                          ) : (
                            <>
                              {message.text || "Document"}
                              {message.isEdited && <span className="text-xs opacity-70 ml-1">(edited)</span>}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    
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
                        hour: '2-digit', 
                        minute: '2-digit' 
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
          <div ref={messagesEndRef} />
        </div>
      )}
    </ScrollArea>
  );
};