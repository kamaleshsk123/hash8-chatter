import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, X } from "lucide-react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { EmojiPickerComponent } from "@/components/EmojiPicker";

interface MessageInputProps {
  newMessage: string;
  isSending: boolean;
  editingMessageId: string | null;
  otherUser: any;
  replyToMessage: any;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleSendMessage: () => void;
  handleFileUpload: (file: File) => void;
  handleVoiceMessage: (audioBlob: Blob, duration: number) => void;
  handleEmojiSelect: (emoji: string) => void;
  cancelReply: () => void;
  cancelEditing: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  newMessage,
  isSending,
  editingMessageId,
  otherUser,
  replyToMessage,
  fileInputRef,
  handleInputChange,
  handleKeyPress,
  handleSendMessage,
  handleFileUpload,
  handleVoiceMessage,
  handleEmojiSelect,
  cancelReply,
  cancelEditing,
}) => {
  return (
    <div className="p-4 border-t">
      {replyToMessage && (
        <div className="mb-3 p-2 bg-muted rounded-md border-l-2 border-primary">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-medium text-primary mb-1">
                Replying to {replyToMessage.senderName}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {replyToMessage.text.substring(0, 50)}...
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={cancelReply} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {editingMessageId && (
        <div className="mb-3 p-2 bg-muted rounded-md border-l-2 border-orange-500">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
              Editing message
            </div>
            <Button variant="ghost" size="sm" onClick={cancelEditing} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex items-center bg-background rounded-lg border">
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(file);
              e.target.value = '';
            }
          }}
          className="hidden"
          accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
        />
        
        {/* Left side action buttons */}
        <div className="flex items-center gap-1 px-2 py-2 border-r border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="p-2 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </Button>
          
          <div className="shrink-0">
            <VoiceRecorder 
              onSendVoiceMessage={handleVoiceMessage}
              disabled={isSending}
            />
          </div>
          
          <div className="shrink-0">
            <EmojiPickerComponent 
              onEmojiSelect={handleEmojiSelect}
              disabled={isSending}
              showText={false}
            />
          </div>
        </div>
        
        {/* Input field */}
        <Input
          value={newMessage}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={editingMessageId ? "Edit message..." : `Message ${otherUser.name}...`}
          className="flex-1 min-w-0 border-0 bg-transparent focus-visible:ring-0 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 px-3"
          disabled={isSending}
        />
        
        {/* Send button */}
        <div className="px-2 py-2">
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            size="sm"
            className="bg-primary text-white rounded-sm  shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};