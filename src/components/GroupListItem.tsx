import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Group } from '@/types';
import { cn } from '@/lib/utils';

interface GroupListItemProps {
  group: Group;
  isSelected?: boolean;
  onClick: () => void;
}

export const GroupListItem: React.FC<GroupListItemProps> = ({ 
  group, 
  isSelected = false, 
  onClick 
}) => {
  return (
    <motion.div
      whileHover={{ backgroundColor: 'hsl(var(--secondary))' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 cursor-pointer",
        "border-b border-border/50 transition-colors",
        isSelected && "bg-primary/5 border-l-4 border-l-primary"
      )}
    >
      <div className="relative">
        <Avatar className="w-12 h-12">
          <AvatarImage src={group.avatar} alt={group.name} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {group.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* Online indicator for groups could show active members */}
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-status-online rounded-full border-2 border-background" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {group.name}
          </h3>
          
          {group.lastMessage && (
            <span className="text-xs text-muted-foreground ml-2">
              {formatDistanceToNow(group.lastMessage.timestamp, { addSuffix: false })}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground truncate">
            {group.lastMessage 
              ? `${group.lastMessage.senderName}: ${group.lastMessage.text}`
              : 'No messages yet'
            }
          </p>
          
          {group.unreadCount && group.unreadCount > 0 && (
            <Badge 
              variant="default" 
              className="ml-2 bg-primary text-primary-foreground text-xs h-5 min-w-5 px-1.5"
            >
              {group.unreadCount > 99 ? '99+' : group.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
};