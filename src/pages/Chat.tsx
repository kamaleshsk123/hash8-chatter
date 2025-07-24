import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ChatBubble } from "@/components/ChatBubble";
import { GroupListItem } from "@/components/GroupListItem";
import { TypingIndicator } from "@/components/TypingIndicator";
import { useAuth } from "@/context/AuthContext";
import { Group, Message, TypingStatus } from "@/types";
import { cn } from "@/lib/utils";
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
  Sun,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatSidebar } from "./ChatSidebar";
import { FeedDemo } from "./FeedDemo";

// Mock data for development
const mockGroups: Group[] = [
  {
    id: "1",
    name: "General",
    avatar: "",
    members: ["user1", "user2", "user3"],
    createdBy: "user1",
    createdAt: new Date(),
    lastMessage: {
      id: "msg1",
      groupId: "1",
      senderId: "user2",
      senderName: "Alice Johnson",
      text: "Hey everyone! How is the project going?",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      type: "text",
    },
    unreadCount: 2,
  },
  {
    id: "2",
    name: "Development Team",
    avatar: "",
    members: ["user1", "user4", "user5"],
    createdBy: "user1",
    createdAt: new Date(),
    lastMessage: {
      id: "msg2",
      groupId: "2",
      senderId: "user4",
      senderName: "Bob Smith",
      text: "The new feature is ready for testing",
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      type: "text",
    },
    unreadCount: 0,
  },
  {
    id: "3",
    name: "Design Team",
    avatar: "",
    members: ["user1", "user6", "user7"],
    createdBy: "user6",
    createdAt: new Date(),
    lastMessage: {
      id: "msg3",
      groupId: "3",
      senderId: "user6",
      senderName: "Carol Davis",
      text: "New mockups are in Figma",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      type: "text",
    },
    unreadCount: 1,
  },
];

const mockMessages: Message[] = [
  {
    id: "msg1",
    groupId: "1",
    senderId: "user2",
    senderName: "Alice Johnson",
    senderAvatar: "",
    text: "Hey everyone! How is the project going?",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    type: "text",
  },
  {
    id: "msg2",
    groupId: "1",
    senderId: "user3",
    senderName: "Charlie Brown",
    senderAvatar: "",
    text: "Going great! We just finished the authentication system.",
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
    type: "text",
  },
  {
    id: "msg3",
    groupId: "1",
    senderId: "user1", // Current user
    senderName: "You",
    senderAvatar: "",
    text: "Awesome work team! The UI is looking fantastic.",
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
    type: "text",
  },
];

// Add mock chats data
const mockChats = [
  {
    id: "chat1",
    name: "Alice Johnson",
    avatar: "",
    lastMessage: "See you at the meeting!",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: "chat2",
    name: "Bob Smith",
    avatar: "",
    lastMessage: "Thanks for the update.",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: "chat3",
    name: "Carol Davis",
    avatar: "",
    lastMessage: "Can you review the document?",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
];

const Chat = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(
    mockGroups[0]
  );
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [directMessages, setDirectMessages] = useState<{
    [chatId: string]: Message[];
  }>({});
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"chat" | "feed">("chat");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user) return;

    if (selectedGroup) {
      const message: Message = {
        id: `msg_${Date.now()}`,
        groupId: selectedGroup.id,
        senderId: user.uid,
        senderName: user.name,
        senderAvatar: user.avatar,
        text: newMessage.trim(),
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, message]);
      setNewMessage("");
      // toast({
      //   title: "Message sent!",
      //   description: "Your message has been delivered.",
      // });
    } else if (selectedChat) {
      const message: Message = {
        id: `dm_${Date.now()}`,
        groupId: "",
        senderId: user.uid,
        senderName: user.name,
        senderAvatar: user.avatar,
        text: newMessage.trim(),
        timestamp: new Date(),
        type: "text",
      };
      setDirectMessages((prev) => {
        const chatId = selectedChat.id;
        const prevMsgs = prev[chatId] || [];
        return { ...prev, [chatId]: [...prevMsgs, message] };
      });
      setNewMessage("");
      // toast({
      //   title: "Message sent!",
      //   description: "Your message has been delivered.",
      // });
      // Add a mock reply from the other user after a short delay
      setTimeout(() => {
        setDirectMessages((prev) => {
          const chatId = selectedChat.id;
          const prevMsgs = prev[chatId] || [];
          return {
            ...prev,
            [chatId]: [
              ...prevMsgs,
              {
                id: `dm_reply_${Date.now()}`,
                groupId: "",
                senderId: selectedChat.id,
                senderName: selectedChat.name,
                senderAvatar: selectedChat.avatar,
                text: "This is a reply!",
                timestamp: new Date(),
                type: "text",
              },
            ],
          };
        });
      }, 1000);
    }
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
        variant: "destructive",
      });
    }
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    setSelectedChat(null);
    setView("chat");
    if (isMobile) setSidebarOpen(false);
  };
  const handleSelectChat = (chat: any) => {
    setSelectedChat(chat);
    setSelectedGroup(null);
    setView("chat");
    if (isMobile) setSidebarOpen(false);
  };

  const groupMessages = messages.filter(
    (msg) => msg.groupId === selectedGroup?.id
  );

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-chat-bg">
      {/* Sidebar and mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop overlay for mobile */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <ChatSidebar
              user={user}
              isMobile={isMobile}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              handleSignOut={handleSignOut}
              mockGroups={mockGroups}
              mockChats={mockChats}
              selectedGroup={selectedGroup}
              selectedChat={selectedChat}
              handleSelectGroup={handleSelectGroup}
              handleSelectChat={handleSelectChat}
              onFeedClick={() => {
                setView("feed");
                if (isMobile) setSidebarOpen(false);
              }}
            />
          </>
        )}
      </AnimatePresence>
      {/* Main area: show FeedDemo or Chat UI */}
      {view === "feed" ? (
        <FeedDemo onBack={() => setView("chat")} />
      ) : (
        <div className="flex-1 flex flex-col min-h-0 ">
          {/* Chat Header */}
          <div className="sticky top-0 z-20 bg-chat-header shadow-header border-b border-border px-2 sm:px-4 lg:px-0 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Sidebar open button for mobile */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden mr-2">
                <Menu className="w-5 h-5" />
              </Button>
              {selectedGroup && (
                <>
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={selectedGroup.avatar}
                      alt={selectedGroup.name}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedGroup.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-base sm:text-lg text-foreground truncate">
                      {selectedGroup.name}
                    </h2>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedGroup.members.length} members
                    </p>
                  </div>
                </>
              )}
              {selectedChat && (
                <>
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={selectedChat.avatar}
                      alt={selectedChat.name}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedChat.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-base sm:text-lg text-foreground truncate">
                      {selectedChat.name}
                    </h2>
                    <p className="text-xs text-muted-foreground truncate">
                      Online
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Users className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* Main chat scrollable area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto bg-gradient-chat px-2 sm:px-4 lg:px-0">
              <div className="py-4 px-2 w-full">
                <AnimatePresence>
                  {(selectedGroup
                    ? groupMessages
                    : directMessages[selectedChat?.id] || []
                  ).map((message, index, arr) => {
                    const prevMessage = arr[index - 1];
                    const isConsecutive =
                      prevMessage &&
                      prevMessage.senderId === message.senderId &&
                      message.timestamp.getTime() -
                        prevMessage.timestamp.getTime() <
                        60000;
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
            <div className="p-2 sm:p-4 bg-chat-header border-t border-border sticky bottom-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 relative">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="pr-10 sm:pr-12 bg-background/50 text-sm sm:text-base"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  size="icon"
                  className="bg-primary hover:bg-primary-hover w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
