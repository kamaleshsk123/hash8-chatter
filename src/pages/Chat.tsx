import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ChatBubble } from "@/components/ChatBubble";
import { formatChatDate, isSameDay } from "@/utils/dateUtils";
import { formatDistanceToNow } from "date-fns";
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
  getUserRoleInOrganization,
  getOrganizationByUID,
  getGroupDetails,
} from "@/services/firebase";
import {
  togglePinGroupMessage,
  deleteGroupMessage,
  editGroupMessage,
} from "@/services/groups";
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
  Pin,
  PinOff,
  X,
  Edit2,
  MessageSquare,
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
import { GlobalSearch } from "@/components/GlobalSearch";
import { ThreadView } from "@/components/ThreadView";
import { PinnedMessagesSidebar } from "@/components/PinnedMessagesSidebar";

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
  const [selectedGroup, setSelectedGroup] = useState<any | null>(() => {
    const urlGroupId = searchParams.get('groupId');
    const urlView = searchParams.get('view');
    // If it's a direct message, the groupId is the conversationId
    if (urlView === 'direct_message' && urlGroupId) {
      return { id: urlGroupId, type: 'direct_message' };
    }
    return urlGroupId ? { id: urlGroupId } : null;
  });
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

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
  const [selectedThreadMessage, setSelectedThreadMessage] = useState<Message | null>(null);
  const [showPinnedSidebar, setShowPinnedSidebar] = useState(false);
  const refreshOrganizationsRef = useRef<() => void>(() => {});

  // Function to update URL with current state
  const updateURL = (newView: string, orgId?: string, groupId?: string) => {
    const params = new URLSearchParams();
    params.set('view', newView);
    if (orgId) {
      params.set('orgId', orgId);
    }
    if (groupId) {
      params.set('groupId', groupId);
    }
    setSearchParams(params);
  };

  const handleSearchResult = (type: 'chat' | 'feed' | 'direct_message' | 'your-feed', id: string, extra?: any) => {
    setView(type as any);
    if (type === 'chat') {
      // Group chat selected from search
      setSelectedGroup({
        id: id,
        name: extra?.name || 'Group Chat',
        type: 'group',
        members: extra?.members || [],
        avatar: extra?.avatar || '',
      });
      if (extra?.orgId) {
        setSelectedOrg({ id: extra.orgId });
      }
      updateURL('chat', extra?.orgId || selectedOrg?.id, id);
    } else if (type === 'direct_message' && extra) {
      if (!user) return;
      const conversationId = [user.uid, id].sort().join('_');
      setSelectedGroup({
        id: conversationId,
        name: extra.name,
        type: 'direct_message',
        otherUser: {
          userId: extra.userId || id,
          name: extra.name,
          avatar: extra.avatar
        }
      });
      updateURL('direct_message', undefined, conversationId);
    } else if (type === 'feed') {
      const org = { id: id };
      setSelectedOrg(org);
      updateURL('feed', id);
    } else if (type === 'your-feed') {
      setView('your-feed');
      updateURL('your-feed');
    }
    
    if (isMobile) setSidebarOpen(false);
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

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-primary/20', 'transition-colors', 'duration-500');
      setTimeout(() => {
        el.classList.remove('bg-primary/20');
      }, 2000);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Fetch group/conversation details if initialized from URL with only an ID
  useEffect(() => {
    if (selectedGroup && !selectedGroup.name && !selectedGroup.type) {
      const fetchDetails = async () => {
        try {
          // Check if it's a direct message (conversation ID usually has an underscore)
          if (selectedGroup.id.includes('_')) {
            const participants = selectedGroup.id.split('_');
            const otherUserId = participants.find(id => id !== user?.uid);
            if (otherUserId) {
              const profiles = await getUsersByIds([otherUserId]);
              if (profiles && profiles.length > 0) {
                const profile = profiles[0];
                setSelectedGroup({
                  id: selectedGroup.id,
                  name: `Direct Message with ${profile.displayName || otherUserId}`,
                  type: 'direct_message',
                  otherUser: {
                    userId: otherUserId,
                    name: profile.displayName || otherUserId,
                    avatar: profile.avatar || ""
                  },
                  avatar: profile.avatar || "",
                  members: participants
                });
                setView("direct_message");
              }
            }
          } else if (selectedOrg?.id) {
            // Hydrate regular group details
            const groupDetails = await getGroupDetails(selectedOrg.id, selectedGroup.id);
            if (groupDetails) {
              setSelectedGroup(groupDetails);
            }
          }
        } catch (err) {
          console.error("Error hydrating group details:", err);
        }
      };
      fetchDetails();
    }

    // Hydrate organization details if missing
    if (selectedOrg && !selectedOrg.name && user?.uid) {
      const fetchOrgDetails = async () => {
        try {
          const [role, orgData] = await Promise.all([
            getUserRoleInOrganization(user.uid, selectedOrg.id),
            getOrganizationByUID(selectedOrg.id)
          ]);
          
          if (orgData) {
            setSelectedOrg({
              ...orgData,
              userRole: role
            });
          }
        } catch (err) {
          console.error("Error hydrating organization details:", err);
        }
      };
      fetchOrgDetails();
    }
  }, [selectedGroup, selectedOrg, user?.uid]);

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
        if (editingMessageId) {
          // Handle edit mode
          await editGroupMessage(selectedOrg.id, selectedGroup.id, editingMessageId, newMessage.trim());
          setEditingMessageId(null);
          setEditingText("");
          setNewMessage("");
          toast({
            title: "Message updated",
            description: "Your message has been edited successfully."
          });
        } else {
          // Handle new message mode
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
        }
      } catch (error) {
        console.error("Error in message action:", error);
        toast({
          title: "Error",
          description: editingMessageId ? "Failed to update message." : "Failed to send message. Please try again.",
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
      updateURL("direct_message", undefined, group.id);
    } else {
      // Handle regular group selection
      setSelectedGroup(group);
      setSelectedOrg(org);
      setSelectedChat(null);
      setView("chat");
      updateURL("chat", org?.id, group?.id);
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

  const handleTogglePin = async (messageId: string, isPinned: boolean) => {
    if (!selectedOrg || !selectedGroup) return;
    try {
      await togglePinGroupMessage(selectedOrg.id, selectedGroup.id, messageId, user?.uid || '', isPinned);
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast({
        title: "Error",
        description: "Failed to update pin status.",
        variant: "destructive",
      });
    }
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingText(message.text);
    setNewMessage(message.text);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText("");
    setNewMessage("");
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
      
      {/* Global Search Component */}
      <GlobalSearch 
        onSelectResult={handleSearchResult as any} 
        currentOrgId={selectedOrg?.id}
      />

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
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 bg-background border-r relative">
          {/* Chat Header */}
          <div className="sticky top-0 z-20 bg-chat-header shadow-header border-b border-border px-2 sm:px-4 lg:px-6 py-2.5 flex items-center justify-between">
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
                                    <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                      {displayName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
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
                  <Button variant="ghost" size="icon" className="relative" onClick={() => setShowPinnedSidebar(!showPinnedSidebar)}>
                    <Pin className="w-4 h-4" />
                    {messages.filter(m => m.isPinned).length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground shadow-sm">
                        {messages.filter(m => m.isPinned).length}
                      </span>
                    )}
                  </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        // Trigger Cmd+K programmatically if needed, 
                        // but standard way is to show hint or just let shortcut handle it.
                        // For UX, I'll add a tooltip/hint or just open it.
                        const event = new KeyboardEvent('keydown', {
                          key: 'k',
                          metaKey: true,
                          bubbles: true
                        });
                        document.dispatchEvent(event);
                      }}
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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

            {/* Chat Messages */}
            <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
              <div className="flex-1 overflow-y-auto px-1 sm:px-4 py-6 custom-scrollbar flex flex-col">
                {messagesLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
                    </div>
                    <p className="text-sm text-muted-foreground animate-pulse">Loading conversation...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-primary/20" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Start the conversation by sending a message below!
                    </p>
                  </div>
                ) : (
                  <>
                    <AnimatePresence initial={false}>
                      {messages
                        .filter(m => !m.parentMessageId) // Only show top-level messages
                        .map((msg, index) => {
                        const isConsecutive = index > 0 && messages[index - 1].senderId === msg.senderId;
                        return (
                          <div key={msg.id} id={`msg-${msg.id}`} className="rounded-2xl">
                            <ChatBubble
                              message={msg}
                              isConsecutive={isConsecutive}
                              currentUserRole={selectedOrg?.userRole}
                              organizationId={selectedOrg?.id}
                              groupId={selectedGroup?.id}
                              onTogglePin={handleTogglePin}
                              onEditMessage={(msg) => {
                                setEditingMessageId(msg.id);
                                setEditingText(msg.text);
                                setNewMessage(msg.text);
                              }}
                              onMessageDeleted={() => {}}
                              onReply={(msg) => setSelectedThreadMessage(msg)}
                            />
                          </div>
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
              {editingMessageId && (
                <div className="mb-2 px-3 py-1.5 bg-primary/5 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Edit2 className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-[11px] text-muted-foreground truncate">
                      Editing: {editingText}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={cancelEditing} className="h-5 w-5 rounded-full">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
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
          {/* Thread Sidebar */}
          {selectedThreadMessage && (
            <ThreadView
              parentMessage={selectedThreadMessage}
              orgId={selectedOrg?.id}
              groupId={selectedGroup?.id}
              onClose={() => setSelectedThreadMessage(null)}
            />
          )}
          {showPinnedSidebar && (
            <PinnedMessagesSidebar
              messages={messages}
              onClose={() => setShowPinnedSidebar(false)}
              onTogglePin={handleTogglePin}
              onMessageClick={scrollToMessage}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Chat;
