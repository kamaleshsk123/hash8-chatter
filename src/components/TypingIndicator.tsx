import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TypingStatus } from '@/types';

interface TypingIndicatorProps {
  typingUsers: TypingStatus[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  const typingNames = typingUsers.map(user => user.userName);
  const displayText = typingNames.length === 1 
    ? `${typingNames[0]} is typing...`
    : typingNames.length === 2
    ? `${typingNames.join(' and ')} are typing...`
    : `${typingNames.slice(0, 2).join(', ')} and ${typingNames.length - 2} others are typing...`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-3 px-4 py-2"
    >
      <div className="flex -space-x-2">
        {typingUsers.slice(0, 3).map((user, index) => (
          <Avatar key={user.userId} className="w-6 h-6 border-2 border-background">
            <AvatarFallback className="text-xs bg-status-typing/10 text-status-typing">
              {user.userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-status-typing font-medium">
          {displayText}
        </span>
        
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 bg-status-typing rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.1
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};