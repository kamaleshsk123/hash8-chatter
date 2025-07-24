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
import React, { useEffect, useState } from "react";
import { QrReader } from "react-qr-reader";
import { useToast } from "@/hooks/use-toast";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { JoinOrganizationDialog } from "./JoinOrganizationDialog";

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

  // Selected organization state
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedOrgId && orgs.length > 0) {
      setSelectedOrgId(orgs[0].id);
    }
  }, [orgs, selectedOrgId]);

  return (
    <motion.div
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      transition={{ duration: 0.2 }}
      className="z-50 w-4/5 max-w-xs bg-chat-sidebar shadow-sidebar border-r border-border flex flex-col fixed inset-y-0 left-0 lg:static lg:w-80 lg:max-w-none">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="p-2">
                  <Settings className="w-4 h-4" />
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
      {/* Organization Section */}
      <div className="px-4 py-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Organization
        </h2>
      </div>
      <div className="flex flex-col gap-3  pb-2">
        {orgsLoading ? (
          <div className="text-xs text-muted-foreground">Loading...</div>
        ) : orgs.length === 0 ? (
          <div className="text-xs text-destructive">
            You are not in any organization.
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
              roleIcon = <Shield className="w-4 h-4 text-primary mr-1" />;
              roleLabel = "Admin";
            } else if (details.role === "member") {
              roleIcon = (
                <UserIcon className="w-4 h-4 text-muted-foreground mr-1" />
              );
              roleLabel = "Member";
            }
            const isSelected = selectedOrgId === org.id;
            return (
              <div
                key={org.id}
                className={
                  `flex items-center gap-2 cursor-pointer rounded-lg px-2 py-2 transition-colors ` +
                  (isSelected
                    ? "bg-primary/10 border-l-4 border-primary rounded-r-sm rounded-l-none"
                    : "hover:bg-muted")
                }
                onClick={() => setSelectedOrgId(org.id)}>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={getAvatarColor(org.name || "")}>
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
      {/* Chats List */}
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
                selectedChat?.id === chat.id && "bg-muted"
              )}
              onClick={() => handleSelectChat(chat)}>
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
      <div className="sticky bottom-0 w-full bg-chat-sidebar p-4 border-t border-border flex justify-center z-20">
        <Button
          className="w-full font-semibold text-base"
          variant="default"
          onClick={onFeedClick}>
          Feed
        </Button>
      </div>
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
    </motion.div>
  );
};
