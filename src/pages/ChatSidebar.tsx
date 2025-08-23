import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Search,
  Settings,
  Sun,
  Moon,
  LogOut,
  Users,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { Building2, LogIn } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import QRCode from "react-qr-code";
import {
  createOrganization,
  joinOrganization,
  getUserOrganizations,
  getOrganizationMemberCount,
  getUserRoleInOrganization,
} from "@/services/firebase";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";
import { Group, Message, TypingStatus } from "@/types";
import React, { useEffect, useState, useRef } from "react";
import { QrReader } from "react-qr-reader";
import { useToast } from "@/hooks/use-toast";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { JoinOrganizationDialog } from "./JoinOrganizationDialog";
import ReactDOM from "react-dom";
import { OrganizationSidebar } from "./OrganizationSidebar";

interface ChatSidebarProps {
  user: any;
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
  handleSignOut: () => void;
  mockChats: any[];
  selectedChat: any;
  handleSelectChat: (chat: any) => void;
  onFeedClick: () => void;
  onOrgFeedClick?: () => void;
  view: "chat" | "feed" | "your-feed";
  onOrganizationSettingsClick: (org: any) => void;
  onOrganizationUpdate?: (updatedOrg: any) => void;
  refreshOrganizationsRef?: React.MutableRefObject<() => void>;
  onGroupSelect?: (group: any, org: any) => void;
  selectedGroupId?: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  user,
  isMobile,
  sidebarOpen,
  setSidebarOpen,
  isDarkMode,
  setIsDarkMode,
  handleSignOut,
  mockChats,
  selectedChat,
  handleSelectChat,
  onFeedClick,
  onOrgFeedClick,
  view,
  onOrganizationSettingsClick,
  onOrganizationUpdate,
  refreshOrganizationsRef,
  onGroupSelect,
  selectedGroupId,
}) => {
  const { toast } = useToast();
  const [orgDialogOpen, setOrgDialogOpen] = React.useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const isMobileView =
    typeof window !== "undefined" ? window.innerWidth < 640 : false;

  // Camera support check for QR scan
  const canScan =
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  // Organization state
  const [orgs, setOrgs] = useState<any[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgDetails, setOrgDetails] = useState<
    Record<
      string,
      { role: string | null; memberCount: number | null; loading: boolean }
    >
  >({});

  // Function to refresh organizations
  const refreshOrganizations = () => {
    setOrgsLoading(true);
    getUserOrganizations(user.uid)
      .then((orgs) => {
        setOrgs(orgs);
      })
      .catch(() => {
        setOrgs([]);
      })
      .finally(() => {
        setOrgsLoading(false);
      });
  };

  // Expose refreshOrganizations via ref
  useEffect(() => {
    if (refreshOrganizationsRef) {
      refreshOrganizationsRef.current = refreshOrganizations;
    }
  }, [refreshOrganizationsRef]);

  // Handle organization updates from settings
  const handleOrganizationUpdate = (updatedOrg: any) => {
    // Update the org in the local state
    setOrgs((prevOrgs) =>
      prevOrgs.map((org) =>
        org.id === updatedOrg.id ? { ...org, ...updatedOrg } : org
      )
    );

    // Call the parent callback if provided
    if (onOrganizationUpdate) {
      onOrganizationUpdate(updatedOrg);
    }
  };

  useEffect(() => {
    let mounted = true;
    setOrgsLoading(true);
    getUserOrganizations(user.uid)
      .then((orgs) => {
        if (mounted) setOrgs(orgs);
      })
      .catch(() => {
        if (mounted) setOrgs([]);
      })
      .finally(() => {
        if (mounted) setOrgsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user.uid]);

  // Fetch role and member count for each org
  useEffect(() => {
    if (!orgs || orgs.length === 0) return;
    orgs.forEach((org) => {
      setOrgDetails((prev) => ({
        ...prev,
        [org.id]: { role: null, memberCount: null, loading: true },
      }));
      Promise.all([
        getUserRoleInOrganization(user.uid, org.id),
        getOrganizationMemberCount(org.id),
      ]).then(([role, memberCount]) => {
        setOrgDetails((prev) => ({
          ...prev,
          [org.id]: { role, memberCount, loading: false },
        }));
      });
    });
  }, [orgs, user.uid]);

  // Add color palette and hash function
  const AVATAR_COLORS = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-yellow-100 text-yellow-700",
    "bg-red-100 text-red-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-teal-100 text-teal-700",
    "bg-orange-100 text-orange-700",
    "bg-cyan-100 text-cyan-700",
  ];
  function getAvatarColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
  }

  // Unified sidebar selection state
  // { type: 'org' | 'chat', id: string }
  const [selectedSidebarItem, setSelectedSidebarItem] = useState<{
    type: "org" | "chat";
    id: string;
  } | null>(() => {
    // Initialize from localStorage if available
    const saved = localStorage.getItem("selectedSidebarItem");
    return saved ? JSON.parse(saved) : null;
  });

  // Persist selectedSidebarItem to localStorage whenever it changes
  useEffect(() => {
    if (selectedSidebarItem) {
      localStorage.setItem(
        "selectedSidebarItem",
        JSON.stringify(selectedSidebarItem)
      );
    } else {
      localStorage.removeItem("selectedSidebarItem");
    }
  }, [selectedSidebarItem]);

  // On orgs or chats load, select first org or chat if nothing selected
  useEffect(() => {
    if (view === "feed" || view === "your-feed") return;
    if (!orgs || orgs.length === 0) {
      if (selectedSidebarItem) setSelectedSidebarItem(null);
      return;
    }
    // If there is a selectedSidebarItem, check if it exists in orgs (for org type)
    if (selectedSidebarItem) {
      if (
        selectedSidebarItem.type === "org" &&
        !orgs.some((o) => o.id === selectedSidebarItem.id)
      ) {
        setSelectedSidebarItem(null);
      }
      // If it's a chat, you can add similar logic if needed
      return;
    }
    // If nothing is selected and orgs exist, select the first org
    setSelectedSidebarItem({ type: "org", id: orgs[0].id });
  }, [orgs, selectedSidebarItem, view]);

  // Clear selection if view is 'feed' or 'your-feed'
  useEffect(() => {
    if ((view === "feed" || view === "your-feed") && selectedSidebarItem !== null) {
      // For "your-feed", always clear selection to show normal sidebar
      if (view === "your-feed") {
        setSelectedSidebarItem(null);
      }
      // For "feed" (org feed), don't clear organization selection on page refresh
      else if (view === "feed" && selectedSidebarItem.type !== "org") {
        setSelectedSidebarItem(null);
      }
    }
  }, [view]);

  // Confirmation dialog state for switching organization
  const [pendingOrgSwitch, setPendingOrgSwitch] = useState<string | null>(null);
  const [lastSelectedSidebarItem, setLastSelectedSidebarItem] = useState<{
    type: "org" | "chat";
    id: string;
  } | null>(null);

  // Mock data for groups and members (for demo)
  const mockGroups = [
    { id: "g1", name: "General", members: 8 },
    { id: "g2", name: "Design", members: 4 },
    { id: "g3", name: "Development", members: 6 },
  ];
  const mockMembers = [
    {
      id: "u1",
      name: "Alice Johnson",
      avatar: "",
      lastMessage: "See you at the meeting!",
    },
    {
      id: "u2",
      name: "Bob Smith",
      avatar: "",
      lastMessage: "Thanks for the update.",
    },
    {
      id: "u3",
      name: "Carol Davis",
      avatar: "",
      lastMessage: "Can you review the document?",
    },
    {
      id: "u4",
      name: "David Lee",
      avatar: "",
      lastMessage: "Let’s sync up tomorrow.",
    },
  ];

  return (
    <div
      className="z-50 w-4/5 max-w-xs bg-chat-sidebar shadow-sidebar border-r border-border flex flex-col fixed inset-y-0 left-0 lg:static lg:w-80 lg:min-w-80 lg:max-w-80">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-foreground">
            Hash8 Intranet
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2">
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="p-2">
              <Settings className="w-4 h-4" />
            </Button>
            {/* Hide sidebar close button on desktop */}
            <Button
              variant="ghost"
              size="icon"
              className="p-2 lg:hidden"
              onClick={() => setSidebarOpen(false)}>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs sm:text-sm text-foreground truncate">
              {user?.name}
            </p>
            <p className="text-xs text-status-online">Online</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="p-2">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {/* OrganizationSidebar: Show when org is selected */}
      {selectedSidebarItem?.type === "org" && (
        <OrganizationSidebar
          org={(() => {
            const foundOrg = orgs.find((o) => o.id === selectedSidebarItem.id);

            return foundOrg;
          })()}
          orgDetails={
            orgDetails[selectedSidebarItem.id] || {
              role: null,
              memberCount: null,
              loading: true,
            }
          }
          userId={user.uid}
          isMobile={isMobile}
          setSidebarOpen={setSidebarOpen}
          onFeedClick={() => {
            const org = orgs.find((o) => o.id === selectedSidebarItem.id);
            const details = (orgDetails[selectedSidebarItem.id] as any) || {};
            if (org && onOrgFeedClick) {
              onOrgFeedClick({ ...org, userRole: details.role });
            }
          }}
          onBack={() => {
            setSelectedSidebarItem(null);
          }}
          onSettingsClick={() => {
            const org = orgs.find((o) => o.id === selectedSidebarItem.id);
            const details = (orgDetails[selectedSidebarItem.id] as any) || {};
            if (org) {
              onOrganizationSettingsClick({
                ...org,
                userRole: details.role,
                memberCount: details.memberCount,
              });
            }
          }}
          onOrganizationUpdate={handleOrganizationUpdate}
          onGroupSelect={onGroupSelect}
          selectedGroupId={selectedGroupId}
        />
      )}
      {/* Organization Section: Only show if no org is selected */}
      {selectedSidebarItem?.type !== "org" && (
        <>
          <div className="px-4 py-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Organization
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Organization Actions">
                  <Plus className="w-2 h-2 text-muted-foreground hover:text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setOrgDialogOpen(true)}>
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Create Organization
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setJoinDialogOpen(true)}>
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Join Organization
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-col gap-3  pb-2">
            {orgsLoading ? (
              <div className="text-xs text-muted-foreground">Loading...</div>
            ) : orgs.length === 0 ? (
              <div className="pl-4 mt-[-0.5em] ">
                <span className="text-xs text-muted-foreground  italic">
                  You are not in any organization.
                </span>
              </div>
            ) : (
              orgs.map((org) => {
                const details = orgDetails[org.id] || {
                  role: null,
                  memberCount: null,
                  loading: true,
                };
                let roleIcon = null;
                let roleLabel = "";
                if (details.role === "admin") {
                  roleIcon = <Shield className="w-4 h-4 text-yellow-600 mr-1" />;
                  roleLabel = "Admin";
                } else if (details.role === "moderator") {
                  roleIcon = <Shield className="w-4 h-4 text-blue-600 mr-1" />;
                  roleLabel = "Moderator";
                } else if (details.role === "member") {
                  roleIcon = (
                    <UserIcon className="w-4 h-4 text-muted-foreground mr-1" />
                  );
                  roleLabel = "Member";
                }
                const isSelected =
                  selectedSidebarItem?.type === "org" &&
                  selectedSidebarItem?.id === org.id;
                return (
                  <div
                    key={org.id}
                    className={
                      `flex items-center gap-2 cursor-pointer rounded-lg px-2 py-2 transition-colors ` +
                      (isSelected
                        ? "bg-primary/10 border-l-4 border-primary rounded-r-sm rounded-l-none"
                        : "hover:bg-muted")
                    }
                    onClick={() => {
                      if (
                        selectedSidebarItem?.type === "org" &&
                        selectedSidebarItem?.id === org.id
                      )
                        return;
                      setPendingOrgSwitch(org.id);
                      setLastSelectedSidebarItem(selectedSidebarItem);
                    }}>
                    <Avatar className="w-8 h-8">
                      <AvatarFallback
                        className={getAvatarColor(org.name || "")}>
                        {org.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-foreground">
                        {org.name}
                      </span>
                      {details.loading ? (
                        <span className="text-xs text-muted-foreground">
                          Loading...
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-2">
                          {roleIcon}
                          {roleLabel}
                          <Users className="w-4 h-4 ml-3 mr-1 text-muted-foreground" />
                          {details.memberCount ?? "-"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
      {/* Chats List: Only show if no org is selected */}
      {selectedSidebarItem?.type !== "org" && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Chats
            </h2>
          </div>
          <div className="space-y-1">
            {mockChats.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors",
                  selectedSidebarItem?.type === "chat" &&
                    selectedSidebarItem?.id === chat.id &&
                    "bg-muted"
                )}
                onClick={() =>
                  setSelectedSidebarItem({ type: "chat", id: chat.id })
                }>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={chat.avatar} alt={chat.name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {chat.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-foreground truncate">
                    {chat.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {chat.lastMessage}
                  </div>
                </div>
                {/* Optionally, show time or unread badge */}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Feed button for default sidebar (no org selected) */}
      {selectedSidebarItem?.type !== "org" && (
        <div className="sticky bottom-0 w-full bg-chat-sidebar p-4 border-t border-border flex justify-center z-20">
          <Button
            className="w-full font-semibold text-base"
            variant="default"
            onClick={() => {
              setSelectedSidebarItem(null); // Clear organization selection
              onFeedClick();
            }}>
            Feed
          </Button>
        </div>
      )}
      {/* Create Organization Dialog */}
      <CreateOrganizationDialog
        open={orgDialogOpen}
        onOpenChange={setOrgDialogOpen}
        user={user}
        onSuccess={refreshOrganizations}
      />
      {/* Join Organization Dialog */}
      <JoinOrganizationDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        user={user}
        onSuccess={refreshOrganizations}
      />
      {/* Organization Switch Confirmation Dialog (Portal) */}
      {pendingOrgSwitch &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 flex flex-col items-center w-full max-w-xs">
              <div className="mb-6 text-center">
                <div className="text-lg font-semibold mb-2">
                  Switch Organization?
                </div>
                <div className="text-sm text-muted-foreground">
                  Are you sure you want to switch to this organization?
                </div>
              </div>
              <div className="flex gap-4 w-full justify-center">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPendingOrgSwitch(null)}>
                  Cancel
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    setSelectedSidebarItem({
                      type: "org",
                      id: pendingOrgSwitch,
                    });
                    setPendingOrgSwitch(null);
                  }}>
                  Switch
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
