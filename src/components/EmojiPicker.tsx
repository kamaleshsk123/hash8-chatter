import React, { useState } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

interface EmojiPickerComponentProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  showText?: boolean;
}

export const EmojiPickerComponent: React.FC<EmojiPickerComponentProps> = ({
  onEmojiSelect,
  disabled = false,
  showText = true
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {showText ? (
          <div className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-1.5 text-sm rounded-sm w-full">
            <Smile className="h-4 w-4" />
            <span>Add Reaction</span>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="p-2"
          >
            <Smile className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" side="top" align="end">
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          autoFocusSearch={false}
          height={400}
          width={350}
          searchDisabled={false}
          skinTonesDisabled={false}
          previewConfig={{
            showPreview: false
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
