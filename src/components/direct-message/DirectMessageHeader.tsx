import React from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical } from "lucide-react";

interface DirectMessageHeaderProps {
  otherUser: {
    name: string;
    avatar: string;
    role?: string;
  };
}

export const DirectMessageHeader: React.FC<DirectMessageHeaderProps> = ({ otherUser }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-3 flex-1">
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherUser.avatar} alt={otherUser.name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {otherUser.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{otherUser.name}</h3>
          {otherUser.role && (
            <p className="text-xs text-muted-foreground">
              {otherUser.role}
            </p>
          )}
        </div>
      </div>

      <Button variant="ghost" size="sm" className="p-2">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </div>
  );
};