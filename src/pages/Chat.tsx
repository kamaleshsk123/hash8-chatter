import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ChatBubble } from '@/components/ChatBubble';
import { GroupListItem } from '@/components/GroupListItem';
import { TypingIndicator } from '@/components/TypingIndicator';
import { useAuth } from '@/context/AuthContext';
import { Group, Message, TypingStatus } from '@/types';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Menu, 
  MoreVertical, 
  Users, 
  Search,
  Plus,
  Settings,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock data for development
const mockGroups: Group[] = [
  {
    id: '1',
    name: 'General',
    avatar: '',
    members: ['user1', 'user2', 'user3'],
    createdBy: 'user1',
    createdAt: new Date(),
    lastMessage: {
      id: 'msg1',
      groupId: '1',
      senderId: 'user2',
      senderName: 'Alice Johnson',
      text: 'Hey everyone! How is the project going?',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      type: 'text'
    },
    unreadCount: 2
  },
  {
    id: '2',
    name: 'Development Team',
    avatar: '',
    members: ['user1', 'user4', 'user5'],
    createdBy: 'user1',
    createdAt: new Date(),
    lastMessage: {
      id: 'msg2',
      groupId: '2',
      senderId: 'user4',
      senderName: 'Bob Smith',
      text: 'The new feature is ready for testing',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      type: 'text'
    },
    unreadCount: 0
  },
  {
    id: '3',
    name: 'Design Team',
    avatar: '',
    members: ['user1', 'user6', 'user7'],
    createdBy: 'user6',
    createdAt: new Date(),
    lastMessage: {
      id: 'msg3',
      groupId: '3',
      senderId: 'user6',
      senderName: 'Carol Davis',
      text: 'New mockups are in Figma',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      type: 'text'
    },
    unreadCount: 1
  }
];

const mockMessages: Message[] = [
  {
    id: 'msg1',
    groupId: '1',
    senderId: 'user2',
    senderName: 'Alice Johnson',
    senderAvatar: '',
    text: 'Hey everyone! How is the project going?',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    type: 'text'
  },
  {
    id: 'msg2',
    groupId: '1',
    senderId: 'user3',
    senderName: 'Charlie Brown',
    senderAvatar: '',
    text: 'Going great! We just finished the authentication system.',
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
    type: 'text'
  },
  {
    id: 'msg3',
    groupId: '1',
    senderId: 'user1', // Current user
    senderName: 'You',
    senderAvatar: '',
    text: 'Awesome work team! The UI is looking fantastic.',
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
    type: 'text'
  }
];

const Chat = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(mockGroups[0]);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedGroup || !user) return;

    const message: Message = {
      id: `msg_${Date.now()}`,
      groupId: selectedGroup.id,
      senderId: user.uid,
      senderName: user.name,
      senderAvatar: user.avatar,
      text: newMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    toast({
      title: "Message sent!",
      description: "Your message has been delivered.",
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const groupMessages = messages.filter(msg => msg.groupId === selectedGroup?.id);

  return (
    <div className="h-screen flex bg-chat-bg">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            className="w-80 bg-chat-sidebar shadow-sidebar border-r border-border flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-foreground">Hash8 Intranet</h1>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                  >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{user?.name}</p>
                  <p className="text-xs text-status-online">Online</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search groups..." 
                  className="pl-10 bg-background/50"
                />
              </div>
            </div>

            {/* Groups List */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Groups
                </h2>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-1">
                {mockGroups.map((group) => (
                  <GroupListItem
                    key={group.id}
                    group={group}
                    isSelected={selectedGroup?.id === group.id}
                    onClick={() => setSelectedGroup(group)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-chat-header shadow-header border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            {selectedGroup && (
              <>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={selectedGroup.avatar} alt={selectedGroup.name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedGroup.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-foreground">{selectedGroup.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedGroup.members.length} members
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Users className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gradient-chat">
          <div className="py-4">
            <AnimatePresence>
              {groupMessages.map((message, index) => {
                const prevMessage = groupMessages[index - 1];
                const isConsecutive = prevMessage && 
                  prevMessage.senderId === message.senderId &&
                  message.timestamp.getTime() - prevMessage.timestamp.getTime() < 60000;
                
                return (
                  <ChatBubble
                    key={message.id}
                    message={message}
                    isConsecutive={isConsecutive}
                  />
                );
              })}
            </AnimatePresence>
            
            <TypingIndicator typingUsers={typingUsers} />
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 bg-chat-header border-t border-border">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="pr-12 bg-background/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              size="sm"
              className="bg-primary hover:bg-primary-hover"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;