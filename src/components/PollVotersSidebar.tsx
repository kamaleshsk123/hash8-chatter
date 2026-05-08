import React, { useEffect, useState } from 'react';
import { X, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Message } from "@/types";
import { getUsersByIds } from "@/services/firebase";

interface PollVotersSidebarProps {
  message: Message;
  onClose: () => void;
}

interface VoterInfo {
  id: string;
  name: string;
  avatar: string;
  optionText: string;
}

export const PollVotersSidebar: React.FC<PollVotersSidebarProps> = ({
  message,
  onClose
}) => {
  const [voters, setVoters] = useState<VoterInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVoters = async () => {
      if (!message.pollData) return;

      // Only show loading on initial fetch, not on updates
      if (voters.length === 0) setIsLoading(true);
      
      try {
        const allUserIds = message.pollData.options.flatMap(opt => opt.userIds || []);
        if (allUserIds.length === 0) {
          setVoters([]);
          setIsLoading(false);
          return;
        }

        const uniqueIds = Array.from(new Set(allUserIds));
        const userDetails = await getUsersByIds(uniqueIds);
        
        const voterList: VoterInfo[] = [];
        
        message.pollData.options.forEach(option => {
          (option.userIds || []).forEach(uid => {
            const user = userDetails.find(u => u.userId === uid || u.uid === uid || u.id === uid);
            if (user) {
              voterList.push({
                id: uid,
                name: user.name || user.displayName || 'Unknown User',
                avatar: user.avatar || user.photoURL || '',
                optionText: option.text
              });
            }
          });
        });

        setVoters(voterList);
      } catch (error) {
        console.error("Error fetching poll voters:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoters();
  }, [JSON.stringify(message?.pollData?.options?.map(o => o.userIds))]);

  return (
    <div className="flex flex-col h-full bg-background border-l shadow-xl w-full sm:w-[350px] animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Poll Results</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 bg-primary/5 border-b">
        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
          {message.pollData?.question}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : voters.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground text-slate-500">No votes yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {voters.map((voter, index) => (
                <div key={`${voter.id}-${index}`} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700">
                      <AvatarImage src={voter.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {voter.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{voter.name}</span>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-primary" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Voted: <span className="text-primary font-bold">{voter.optionText}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-muted/20 text-center">
        <p className="text-xs text-muted-foreground font-medium">
          Total {voters.length} {voters.length === 1 ? 'member' : 'members'} voted
        </p>
      </div>
    </div>
  );
};
