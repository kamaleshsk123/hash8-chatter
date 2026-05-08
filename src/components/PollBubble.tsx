import React from 'react';
import { Message } from '@/types';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import { voteGroupPoll } from '@/services/groups';
import { voteDirectMessagePoll } from '@/services/directMessages';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface PollBubbleProps {
  message: Message;
  organizationId?: string;
  groupId?: string;
  isOwnMessage: boolean;
  onViewVoters?: (optionId?: string) => void;
}

export const PollBubble: React.FC<PollBubbleProps> = ({
  message,
  organizationId,
  groupId,
  isOwnMessage,
  onViewVoters
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const pollData = message.pollData;

  if (!pollData) return null;

  const totalVotes = pollData.options.reduce((acc, opt) => acc + (opt.userIds?.length || 0), 0);

  const handleVote = async (optionId: string) => {
    if (!user) return;

    try {
      if (organizationId && groupId) {
        await voteGroupPoll(organizationId, groupId, message.id, optionId, user.uid);
      } else if (message.conversationId) {
        await voteDirectMessagePoll(message.conversationId, message.id, optionId, user.uid);
      } else if (groupId) {
         await voteDirectMessagePoll(groupId, message.id, optionId, user.uid);
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      toast({
        title: "Error",
        description: "Failed to submit your vote. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className={cn(
      "flex flex-col gap-4 py-2 px-1 min-w-[260px] sm:min-w-[300px]",
      isOwnMessage ? "text-white" : "text-slate-900 dark:text-white"
    )}>
      <div className="flex flex-col gap-1">
        <h3 className="font-bold text-lg tracking-tight leading-snug">
          {pollData.question}
        </h3>
        {pollData.allowMultipleAnswers && (
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-bold opacity-70",
            isOwnMessage ? "text-white/80" : "text-primary"
          )}>
            Select multiple
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {pollData.options.map((option, index) => {
          const voteCount = option.userIds?.length || 0;
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const hasVoted = option.userIds?.includes(user?.uid || '');

          return (
            <motion.div 
              key={option.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Button
                variant="ghost"
                className={cn(
                  "w-full h-auto py-3 px-4 justify-between items-center transition-all relative overflow-hidden rounded-xl border group",
                  isOwnMessage 
                    ? hasVoted 
                      ? "bg-white/20 border-white/40 ring-1 ring-white/50 shadow-lg" 
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                    : hasVoted
                      ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20 shadow-md"
                      : "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-primary/30"
                )}
                onClick={() => handleVote(option.id)}
              >
                {/* Progress Bar Background */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={cn(
                    "absolute left-0 top-0 h-full transition-all duration-500",
                    isOwnMessage ? "bg-white/20" : "bg-primary/15"
                  )}
                />

                <div className="flex items-center gap-3 z-10 w-full">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                    hasVoted 
                      ? isOwnMessage ? "bg-white border-white" : "bg-primary border-primary"
                      : isOwnMessage ? "border-white/30" : "border-slate-300 dark:border-slate-600"
                  )}>
                    {hasVoted && (
                      <Check className={cn(
                        "w-3 h-3",
                        isOwnMessage ? "text-primary" : "text-white"
                      )} />
                    )}
                  </div>
                  
                  <span className={cn(
                    "text-sm font-semibold text-left break-words flex-1",
                    isOwnMessage ? "text-white" : "text-slate-800 dark:text-slate-100",
                    hasVoted && "font-bold"
                  )}>
                    {option.text}
                  </span>

                  <div className="flex flex-col items-end shrink-0">
                    <span className={cn(
                      "text-xs font-bold",
                      isOwnMessage ? "text-white" : "text-slate-900 dark:text-white"
                    )}>
                      {voteCount}
                    </span>
                    <span className={cn(
                      "text-[9px] font-medium opacity-60",
                      isOwnMessage ? "text-white/80" : "text-slate-500"
                    )}>
                      {Math.round(percentage)}%
                    </span>
                  </div>
                </div>
              </Button>
            </motion.div>
          );
        })}
      </div>

      <div className={cn(
        "flex justify-between items-center mt-1 px-1",
        isOwnMessage ? "text-white/70" : "text-slate-500"
      )}>
        <button 
          onClick={() => onViewVoters?.()}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        >
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </span>
        </button>
      </div>
    </div>
  );
};
