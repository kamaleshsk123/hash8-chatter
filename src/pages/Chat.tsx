import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ChatBubble } from "@/components/ChatBubble";
import { GroupListItem } from "@/components/GroupListItem";
import { TypingIndicator } from "@/components/TypingIndicator";
import { useAuth } from "@/context/AuthContext";
import { Group, Message, TypingStatus, User } from "@/types";
import { cn } from "@/lib/utils";
import {
  subscribeToGroupMessages,
  sendGroupMessage,
  subscribeToTypingIndicators,
  updateTypingStatus,
  markMessageAsRead,
  getUsersByIds,
  subscribeToUserStatus,
  leaveGroup,
} from "@/services/firebase";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatSidebar } from "./ChatSidebar";
import { FeedDemo } from "./FeedDemo";
import { YourFeed } from "./YourFeed";
import { OrganizationSettingsView } from "./OrganizationSettingsView";
import { DirectMessage } from "./DirectMessage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InviteToGroupDialog } from "./InviteToGroupDialog";
import { GroupInfoSheet } from "./GroupInfoSheet";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Early return if user is not available
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading user data...</p>
        </div>
      </div>
    );
  }
  // Group and chat state
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<any | null>(() => {
    const urlOrgId = searchParams.get('orgId');
    return urlOrgId ? { id: urlOrgId } : null;
  });
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [directMessages, setDirectMessages] = useState<{
    [chatId: string]: Message[];
  }>({});
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [groupMemberStatuses, setGroupMemberStatuses] = useState<
    Record<string, any>
  >({});

  // Input and interaction state
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Loading states
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // UI state
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Initialize view from URL parameters or default to "your-feed"
  const [view, setView] = useState<"chat" | "feed" | "your-feed" | "direct_message">(() => {
    const urlView = searchParams.get('view');
    if (urlView && ['chat', 'feed', 'your-feed', 'direct_message'].includes(urlView)) {
      return urlView as "chat" | "feed" | "your-feed" | "direct_message";
    }
    return "your-feed";
  });
  const [showOrganizationSettings, setShowOrganizationSettings] =
    useState(false);
  const [selectedOrgForSettings, setSelectedOrgForSettings] =
    useState<any>(null);
  const refreshOrganizationsRef = useRef<() => void>(() => {});

  // Function to update URL with current state
  const updateURL = (newView: string, orgId?: string) => {
    const params = new URLSearchParams();
    params.set('view', newView);
    if (orgId) {
      params.set('orgId', orgId);
    }
    setSearchParams(params);
  };

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isLeaveGroupDialogOpen, setIsLeaveGroupDialogOpen] = useState(false);
  const [isGroupInfoSheetOpen, setIsGroupInfoSheetOpen] = useState(false);

  // Real-time subscriptions
  const messageUnsubscribeRef = useRef<(() => void) | null>(null);
  const typingUnsubscribeRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  // Handler for organization updates
  const handleOrganizationUpdate = (updatedOrg: any) => {
    setSelectedOrgForSettings(updatedOrg);
    // Refresh sidebar organizations after update
    if (refreshOrganizationsRef.current) {
      refreshOrganizationsRef.current();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Real-time message subscription for selected group
  useEffect(() => {
    // Clean up previous subscriptions
    if (messageUnsubscribeRef.current) {
      messageUnsubscribeRef.current();
      messageUnsubscribeRef.current = null;
    }
    if (typingUnsubscribeRef.current) {
      typingUnsubscribeRef.current();
      typingUnsubscribeRef.current = null;
    }

    if (selectedGroup && selectedOrg) {
      setMessagesLoading(true);

      // Subscribe to group messages
      messageUnsubscribeRef.current = subscribeToGroupMessages(
        selectedOrg.id,
        selectedGroup.id,
        (messages) => {
          setMessages(messages);
          setMessagesLoading(false);

          // Mark messages as read
          if (user) {
            messages.forEach((message) => {
              if (
                message.senderId !== user.uid &&
                !message.readBy?.some((r) => r.userId === user.uid)
              ) {
                markMessageAsRead(
                  selectedOrg.id,
                  selectedGroup.id,
                  message.id,
                  user.uid,
                  user.name || user.email || "",
                  user.avatar || ""
                );
              }
            });
          }
        },
        (error) => {
          console.error("Error subscribing to messages:", error);
          setMessagesLoading(false);
          toast({
            title: "Error",
            description: "Failed to load messages. Please try again.",
            variant: "destructive",
          });
        }
      );

      // Subscribe to typing indicators
      typingUnsubscribeRef.current = subscribeToTypingIndicators(
        selectedOrg.id,
        selectedGroup.id,
        (typingStatuses) => {
          // Filter out current user's typing status
          const filteredTyping = typingStatuses.filter(
            (status) => status.userId !== user?.uid
          );
          setTypingUsers(filteredTyping as TypingStatus[]);
        }
      );
    } else {
      // Clear messages when no group is selected
      setMessages([]);
      setTypingUsers([]);
      setMessagesLoading(false);
    }

    // Cleanup function
    return () => {
      if (messageUnsubscribeRef.current) {
        messageUnsubscribeRef.current();
        messageUnsubscribeRef.current = null;
      }
      if (typingUnsubscribeRef.current) {
        typingUnsubscribeRef.current();
        typingUnsubscribeRef.current = null;
      }
    };
  }, [selectedGroup, selectedOrg, user?.uid, toast]);

  // Handle typing indicator updates
  useEffect(() => {
    if (selectedGroup && selectedOrg && user && newMessage) {
      if (!isTyping) {
        setIsTyping(true);
        updateTypingStatus(
          selectedOrg.id,
          selectedGroup.id,
          user.uid,
          user.name,
          true
        );
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        updateTypingStatus(
          selectedOrg.id,
          selectedGroup.id,
          user.uid,
          user.name,
          false
        );
      }, 2000);
    } else if (isTyping) {
      // Stop typing if message is empty
      setIsTyping(false);
      if (selectedGroup && selectedOrg && user) {
        updateTypingStatus(
          selectedOrg.id,
          selectedGroup.id,
          user.uid,
          user.name,
          false
        );
      }
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [newMessage, selectedGroup, selectedOrg, user, isTyping]);

  // Handle URL-based organization loading
  useEffect(() => {
    const urlOrgId = searchParams.get('orgId');
    const urlView = searchParams.get('view');
    
    if (urlOrgId && urlView === 'feed' && !selectedOrg?.name) {
      // Need to load organization data from the sidebar organizations
      // This will be handled by the ChatSidebar's organization list
      console.log('Loading organization from URL:', urlOrgId);
    }
  }, [searchParams, selectedOrg]);

  // Fetch group members and subscribe to their statuses
  useEffect(() => {
    if (selectedGroup?.members && selectedGroup.members.length > 0) {
      const fetchMembers = async () => {
        try {
          const memberDetails = await getUsersByIds(selectedGroup.members);
          setGroupMembers(memberDetails as User[]);
        } catch (error) {
          console.error("Error fetching group members:", error);
          toast({
            title: "Error",
            description: "Could not load group members.",
            variant: "destructive",
          });
        }
      };
      fetchMembers();

      const unsubscribe = subscribeToUserStatus(
        selectedGroup.members,
        (statuses) => {
          setGroupMemberStatuses(statuses);
        }
      );

      return () => {
        unsubscribe();
      };
    } else {
      setGroupMembers([]);
      setGroupMemberStatuses({});
    }
  }, [selectedGroup, toast]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || sendingMessage) return;

    if (selectedGroup && selectedOrg) {
      setSendingMessage(true);

      try {
        await sendGroupMessage(selectedOrg.id, selectedGroup.id, {
          text: newMessage.trim(),
          type: "text",
          senderId: user.uid,
          senderName: user.name || user.email || "Unknown User",
          senderAvatar: user.avatar || "",
        });

        setNewMessage("");

        // Stop typing indicator since message was sent
        if (isTyping) {
          setIsTyping(false);
          updateTypingStatus(
            selectedOrg.id,
            selectedGroup.id,
            user.uid,
            user.name,
            false
          );
        }
      } catch (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      } finally {
        setSendingMessage(false);
      }
    } else if (selectedChat) {
      // Keep direct message logic as mock for now
      const message: Message = {
        id: `dm_${Date.now()}`,
        groupId: "",
        senderId: user.uid,
        senderName: user.name || user.email || "Unknown User",
        senderAvatar: user.avatar || "",
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

  const handleSelectGroup = (group: any, org: any) => {
    // Close organization settings if open
    if (showOrganizationSettings) {
      setShowOrganizationSettings(false);
      setSelectedOrgForSettings(null);
    }
    
    // Handle direct message selection
    if (group?.type === 'direct_message') {
      setSelectedGroup(group);
      setSelectedOrg(null);
      setSelectedChat(null);
      setView("direct_message");
    } else {
      // Handle regular group selection
      setSelectedGroup(group);
      setSelectedOrg(org);
      setSelectedChat(null);
      setView("chat");
    }
    
    if (isMobile) setSidebarOpen(false);
  };

  const handleSelectChat = (chat: any) => {
    // Close organization settings if open
    if (showOrganizationSettings) {
      setShowOrganizationSettings(false);
      setSelectedOrgForSettings(null);
    }
    setSelectedChat(chat);
    setSelectedGroup(null);
    setSelectedOrg(null);
    setView("chat");
    if (isMobile) setSidebarOpen(false);
  };

  // All messages are already filtered by the Firebase subscription

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
              handleSignOut={handleSignOut}
              mockChats={mockChats}
              selectedChat={selectedChat}
              handleSelectChat={handleSelectChat}
              onFeedClick={() => {
                // Close organization settings if open
                if (showOrganizationSettings) {
                  setShowOrganizationSettings(false);
                  setSelectedOrgForSettings(null);
                }
                setView("your-feed");
                updateURL("your-feed");
                if (isMobile) setSidebarOpen(false);
              }}
              onOrgFeedClick={(org) => {
                // Close organization settings if open
                if (showOrganizationSettings) {
                  setShowOrganizationSettings(false);
                  setSelectedOrgForSettings(null);
                }
                setSelectedOrg(org);
                setView("feed");
                updateURL("feed", org.id);
                if (isMobile) setSidebarOpen(false);
              }}
              view={view}
              onOrganizationSettingsClick={(org) => {
                setSelectedOrgForSettings(org);
                setShowOrganizationSettings(true);
              }}
              onOrganizationUpdate={handleOrganizationUpdate}
              refreshOrganizationsRef={refreshOrganizationsRef}
              onGroupSelect={handleSelectGroup}
              selectedGroupId={showOrganizationSettings || view === "feed" || view === "your-feed" ? null : selectedGroup?.id}
              urlOrgId={searchParams.get('orgId')}
            />
          </>
        )}
      </AnimatePresence>
      {/* Main area: show FeedDemo or Chat UI */}
      {showOrganizationSettings && selectedOrgForSettings ? (
        <OrganizationSettingsView
          org={selectedOrgForSettings}
          orgDetails={{
            role: selectedOrgForSettings?.userRole || "member",
            memberCount: selectedOrgForSettings.memberCount || 0,
            loading: false,
          }}
          userId={user.uid}
          onBack={() => {
            setShowOrganizationSettings(false);
            setSelectedOrgForSettings(null);
          }}
          onOrganizationUpdate={handleOrganizationUpdate}
        />
      ) : view === "feed" ? (
        <FeedDemo
          onBack={() => {
            if (isMobile) {
              setSidebarOpen(true);
            } else {
              setView("chat");
              updateURL("chat");
            }
          }}
          org={selectedOrg}
        />
      ) : view === "your-feed" ? (
        <YourFeed
          onBack={() => {
            if (isMobile) {
              setSidebarOpen(true);
            } else {
              setView("chat");
              updateURL("chat");
            }
          }}
        />
      ) : view === "direct_message" && selectedGroup?.type === "direct_message" ? (
        <ErrorBoundary>
          <DirectMessage
            conversationId={selectedGroup.id}
            otherUser={selectedGroup.otherUser}
            onBack={() => {
              if (isMobile) {
                setSidebarOpen(true);
              } else {
                setView("chat");
                setSelectedGroup(null);
              }
            }}
          />
        </ErrorBoundary>
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
                className="lg:hidden mr-2"
              >
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
              {selectedGroup && (
                <>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Users className="w-4 h-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right">
                      <SheetHeader>
                        <SheetTitle>Group Members</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4">
                        <ul className="flex flex-col gap-4">
                          {groupMembers.length > 0 ? (
                            groupMembers.map((member: any, idx: number) => {
                              if (!member || !member.userId) {
                                // Changed to member.userId
                                return null; // Skip rendering if member is undefined or userId is missing
                              }
                              const displayName =
                                member.displayName ||
                                member.name ||
                                member.userId; // Changed to member.userId
                              const avatarUrl = member.avatar || "";
                              const status = groupMemberStatuses[member.userId]; // Changed to member.userId
                              const isOnline =
                                status?.isOnline &&
                                status.lastSeen &&
                                new Date().getTime() -
                                  status.lastSeen.toDate().getTime() <
                                  300000; // 5 minutes

                              return (
                                <li
                                  key={member.userId}
                                  className="flex items-center gap-3"
                                >
                                  <Avatar className="w-9 h-9">
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={displayName}
                                        className="w-9 h-9 rounded-full object-cover"
                                      />
                                    ) : (
                                      <AvatarFallback className="bg-primary/10 text-primary">
                                        {displayName.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div className="flex-grow">
                                    <p className="font-semibold">
                                      {displayName}
                                    </p>
                                    {isOnline ? (
                                      <p className="text-xs text-green-500">
                                        Online
                                      </p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">
                                        Offline
                                      </p>
                                    )}
                                  </div>
                                </li>
                              );
                            })
                          ) : (
                            <p>No members found.</p>
                          )}
                        </ul>
                      </div>
                    </SheetContent>
                  </Sheet>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => setIsInviteDialogOpen(true)}>
                        Add Member
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setIsLeaveGroupDialogOpen(true)}>
                        Leave Group
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setIsGroupInfoSheetOpen(true)}>
                        View Group Info
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <InviteToGroupDialog
                    open={isInviteDialogOpen}
                    onOpenChange={setIsInviteDialogOpen}
                    org={selectedOrg}
                    group={selectedGroup}
                    userId={user.uid}
                  />
                  <AlertDialog
                    open={isLeaveGroupDialogOpen}
                    onOpenChange={setIsLeaveGroupDialogOpen}
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Leave Group</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to leave this group? This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            if (selectedGroup && selectedOrg && user) {
                              try {
                                await leaveGroup({
                                  organizationId: selectedOrg.id,
                                  groupId: selectedGroup.id,
                                  userId: user.uid,
                                });
                                toast({
                                  title: "Success",
                                  description: "You have left the group.",
                                });
                                setSelectedGroup(null);
                              } catch (error) {
                                console.error("Error leaving group:", error);
                                toast({
                                  title: "Error",
                                  description: "Failed to leave group.",
                                  variant: "destructive",
                                });
                              }
                            }
                          }}
                        >
                          Leave
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <GroupInfoSheet
                    open={isGroupInfoSheetOpen}
                    onOpenChange={setIsGroupInfoSheetOpen}
                    group={selectedGroup}
                    org={selectedOrg}
                    members={groupMembers}
                    onSuccess={(updatedGroup) => setSelectedGroup(updatedGroup)}
                  />
                </>
              )}
            </div>
          </div>
          {/* Main chat scrollable area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto bg-gradient-chat px-2 sm:px-4 lg:px-0">
              <div className="py-4 px-2 w-full">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    {/* Empty state for no messages */}
                    {(selectedGroup
                      ? messages
                      : directMessages[selectedChat?.id] || []
                    ).length === 0 &&
                      !messagesLoading && (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                          <div className="text-muted-foreground mb-2">
                            {selectedGroup ? (
                              <>
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-medium mb-2">
                                  Welcome to {selectedGroup.name}!
                                </h3>
                                <p className="text-sm">
                                  Start the conversation by sending the first
                                  message.
                                </p>
                              </>
                            ) : (
                              <>
                                <div className="w-12 h-12 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                                  <span className="text-lg">
                                    {selectedChat?.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <h3 className="text-lg font-medium mb-2">
                                  Chat with {selectedChat?.name}
                                </h3>
                                <p className="text-sm">
                                  Send a message to start your conversation.
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    <AnimatePresence>
                      {(selectedGroup
                        ? messages
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
                            currentUserRole={selectedOrg?.userRole}
                            organizationId={selectedOrg?.id}
                            groupId={selectedGroup?.id}
                            onMessageDeleted={() => {
                              // Refresh messages when a message is deleted
                              // The subscription should handle this automatically
                            }}
                          />
                        );
                      })}
                    </AnimatePresence>
                    <TypingIndicator typingUsers={typingUsers} />
                  </>
                )}
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
                  className="bg-primary hover:bg-primary-hover w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
                >
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
