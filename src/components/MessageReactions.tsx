import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Reaction {
  userId: string;
  userName: string;
  timestamp: Date;
}

interface MessageReactionsProps {
  reactions: Record<string, Reaction[]>;
  currentUserId: string;
  onReactionClick: (emoji: string) => void;
  disabled?: boolean;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  currentUserId,
  onReactionClick,
  disabled = false,
}) => {
  if (!reactions || Object.keys(reactions).length === 0) {
    return null;
  }

  const getReactionTooltip = (emoji: string, reactionList: Reaction[]) => {
    if (reactionList.length === 0) return "";

    if (reactionList.length === 1) {
      return reactionList[0].userName;
    }

    if (reactionList.length <= 3) {
      return reactionList.map((r) => r.userName).join(", ");
    }

    const first = reactionList
      .slice(0, 2)
      .map((r) => r.userName)
      .join(", ");
    return `${first} and ${reactionList.length - 2} others`;
  };

  const hasUserReacted = (reactionList: Reaction[]) => {
    return reactionList.some((r) => r.userId === currentUserId);
  };

  return (
    <div className="flex flex-wrap gap-1 mt-[-0.4em] z-10">
      {Object.entries(reactions).map(([emoji, reactionList]) => (
        <TooltipProvider key={emoji}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReactionClick(emoji)}
                disabled={disabled}
                className="h-6 px-2 text-xs"
              >
                <span className="mr-1">{emoji}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getReactionTooltip(emoji, reactionList)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};
