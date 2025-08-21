import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ReadReceipt } from "@/types";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/time";

interface MessageReadReceiptsProps {
  readBy?: ReadReceipt[];
  currentUserId: string;
  isOwnMessage: boolean;
  className?: string;
}

export const MessageReadReceipts: React.FC<MessageReadReceiptsProps> = ({
  readBy = [],
  currentUserId,
  isOwnMessage,
  className,
}) => {
  const otherUsersRead = readBy.filter(
    (receipt) => receipt.userId !== currentUserId
  );

  if (!isOwnMessage || otherUsersRead.length === 0) {
    return null;
  }

  const maxDisplayCount = 3;
  const displayReceipts = otherUsersRead.slice(0, maxDisplayCount);
  const remainingCount = Math.max(0, otherUsersRead.length - maxDisplayCount);

  // Handles Firestore Timestamps or date strings
  const toDate = (value: any): Date => {
    if (value && typeof value.toDate === 'function') {
      return value.toDate();
    }
    return new Date(value);
  };

  if (displayReceipts.length === 0) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-0.5 mt-1 cursor-pointer",
            className
          )}
        >
          <div className="flex -space-x-1">
            {displayReceipts.map((receipt) => (
              <Avatar
                key={receipt.userId}
                className="w-4 h-4 border border-background ring-1 ring-border"
              >
                <AvatarImage
                  src={receipt.userAvatar}
                  alt={receipt.userName}
                  className="w-4 h-4"
                />
                <AvatarFallback className="w-4 h-4 text-[7px] bg-muted">
                  {receipt.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {remainingCount > 0 && (
              <div className="w-3 h-3 bg-muted border border-background ring-1 ring-border rounded-full flex items-center justify-center">
                <span className="text-[5px] text-muted-foreground font-medium">
                  +{remainingCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Read by</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <ul className="flex flex-col gap-4">
            {otherUsersRead.map((receipt) => (
              <li key={receipt.userId} className="flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarImage
                    src={receipt.userAvatar}
                    alt={receipt.userName}
                  />
                  <AvatarFallback>
                    {receipt.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <p className="font-semibold">{receipt.userName}</p>
                </div>
                <time className="text-xs text-muted-foreground ml-auto">
                  {formatTimeAgo(toDate(receipt.readAt))}
                </time>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
};