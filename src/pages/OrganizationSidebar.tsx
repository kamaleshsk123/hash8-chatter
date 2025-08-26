import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Search,
  Users,
  Shield,
  User as UserIcon,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { formatTimeAgo } from "@/lib/time";
import { offlineCache } from "@/services/offlineCache";
import { 
  getOrganizationGroups, 
  getOrganizationMembers, 
  getUsersByIds, 
  subscribeToUserStatus,
  joinOrganization,
  createOrGetDirectMessage,
  createOrGetDirectMessageOffline
} from "@/services/firebase";
import { CreateGroupDialog } from "./CreateGroupDialog";

// Types for props
interface OrganizationSidebarProps {
  org: any; // The selected organization object
  orgDetails: {
    role: string | null;
    memberCount: number | null;
    loading: boolean;
  };
  userId: string; // Current user's ID
  isMobile?: boolean; // Whether we're on mobile view
  setSidebarOpen?: (open: boolean) => void; // Function to close sidebar on mobile
  onCreateGroup?: () => void;
  onFeedClick?: () => void;
  onBack?: () => void; // Callback to go back to main sidebar
  onYourFeedClick?: () => void; // Callback to navigate to Your Feed page
  onSettingsClick?: () => void; // Callback to open organization settings
  onOrganizationUpdate?: (updatedOrg: any) => void; // Callback for organization updates
  onGroupSelect?: (group: any, org: any) => void; // Callback when a group is selected
  onDirectMessageStart?: (conversationId: string, otherUser: any) => void; // Callback when starting a direct message
  selectedGroupId?: string; // Currently selected group ID
  selectedConversationId?: string; // Currently selected conversation ID for direct messages
  // Add more props as needed for real group/member data
}

export const OrganizationSidebar: React.FC<OrganizationSidebarProps> = ({
  org,
  orgDetails,
  userId,
  isMobile,
  setSidebarOpen,
  onCreateGroup,
  onFeedClick,
  onBack,
  onYourFeedClick,
  onSettingsClick,
  onOrganizationUpdate,
  onGroupSelect,
  onDirectMessageStart,
  selectedGroupId,
  selectedConversationId,
}) => {
  // Real group and member data
  const [groups, setGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [membersLoading, setMembersLoading] = useState(false);
  const [isNotMember, setIsNotMember] = useState(false);
  const [memberStatuses, setMemberStatuses] = useState<Record<string, any>>({});

  const roleOrder: { [key: string]: number } = {
    admin: 1,
    moderator: 2,
    member: 3,
  };

  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();

  // Handle member click to start direct message
  const handleMemberClick = async (member: any) => {
    try {
      const profile = userProfiles[member.userId] || {};
      const otherUserData = {
        userId: member.userId,
        name: profile.displayName || member.userId,
        avatar: profile.avatar || '',
        role: member.role
      };
      
      // Use offline-friendly conversation creation
      const conversation = await createOrGetDirectMessageOffline(userId, member.userId, isOnline);
      
      // Always cache conversation metadata for offline access (online or offline)
      offlineCache.cacheConversationMetadata(conversation.id, otherUserData);
      
      if (onDirectMessageStart) {
        onDirectMessageStart(conversation.id, otherUserData);
      }
      
      // Show appropriate feedback based on network status
      if (!isOnline) {
        if ((conversation as any).isOfflineGenerated) {
          toast({
            title: "Offline Mode",
            description: `Starting chat with ${otherUserData.name}. Messages will sync when online.`,
            duration: 3000,
          });
        } else {
          // This case shouldn't happen with our offline-friendly function,
          // but keeping it as a safety net
          toast({
            title: "Offline Mode",
            description: `Chat opened with ${otherUserData.name}. Some features may be limited.`,
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Error starting direct message:', error);
      
      // Enhanced error handling with more specific fallbacks
      if (!isOnline) {
        // Even if the offline-friendly function fails, try to create a basic conversation
        try {
          const profile = userProfiles[member.userId] || {};
          const basicOtherUserData = {
            userId: member.userId,
            name: profile.displayName || member.userId || `User ${member.userId.slice(-4)}`,
            avatar: profile.avatar || '',
            role: member.role || 'member'
          };
          
          // Generate conversation ID manually as a last resort
          const conversationId = [userId, member.userId].sort().join('_');
          
          // Cache the basic conversation data
          offlineCache.cacheConversationMetadata(conversationId, basicOtherUserData);
          
          if (onDirectMessageStart) {
            onDirectMessageStart(conversationId, basicOtherUserData);
          }
          
          toast({
            title: "Offline Mode",
            description: `Chat started with ${basicOtherUserData.name}. Limited offline functionality.`,
            duration: 4000,
          });
          
        } catch (fallbackError) {
          console.error('Fallback conversation creation also failed:', fallbackError);
          toast({ 
            title: "Offline Error", 
            description: "Unable to start chat while offline. Please try again when connected.",
            variant: "destructive"
          });
        }
      } else {
        toast({ 
          title: "Error", 
          description: "Failed to start direct message. Please try again.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Dialog state
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);

  // Function to refresh groups after creating a new one
  const refreshGroups = () => {
    if (!org?.id) return;
    setGroupsLoading(true);
    getOrganizationGroups(org.id)
      .then(setGroups)
      .finally(() => setGroupsLoading(false));
  };

  useEffect(() => {
    if (!org?.id) return;

    setGroupsLoading(true);
    setMembersLoading(true);

    getOrganizationMembers(org.id)
      .then(async (members) => {
        setMembers(members);

        const isCurrentUserMember = members.some((m: any) => m.userId === userId);
        if (!isCurrentUserMember) {
          setIsNotMember(true);
          return;
        }
        setIsNotMember(false);

        const userIds = members.map((m: any) => m.userId).filter(Boolean);
        if (userIds.length > 0) {
          getUsersByIds(userIds).then((profiles) => {
            const profileMap: Record<string, any> = {};
            profiles.forEach((p: any) => {
              profileMap[p.userId] = p;
            });
            setUserProfiles(profileMap)
          });
          const unsubscribe = subscribeToUserStatus(userIds, (statuses) => {
            setMemberStatuses(statuses);
          });
          return () => unsubscribe();
        } else {
          setUserProfiles({});
        }
      })
      .finally(() => setMembersLoading(false));

    getOrganizationGroups(org.id)
      .then((groups) => {
        const userInGroups = groups.filter((group: any) =>
          group.members && group.members.includes(userId)
        );
        setGroups(userInGroups);
      })
      .finally(() => setGroupsLoading(false));
  }, [org?.id, userId]);

  // Show not member message if user is not a member
  if (isNotMember) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {org?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {org?.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                You are not a member of this organization.
              </p>
            </div>
            <Button
              onClick={() => {
                if (onBack) onBack();
                // Close sidebar on mobile when going back
                if (isMobile && setSidebarOpen) setSidebarOpen(false);
              }}
              variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Organization Info */}
        <div className="px-4 pt-4 pb-2 flex flex-col gap-1 border-b border-border">
          <div
            className="flex items-center gap-3 mb-1 cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-colors"
            onClick={() => {
              onSettingsClick();
              // Close sidebar on mobile when clicking organization name
              if (isMobile && setSidebarOpen) setSidebarOpen(false);
            }}>
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-primary/10 text-primary">
                {org?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold text-base text-foreground">
                {org?.name}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                {orgDetails?.memberCount ?? "-"} Member(s)
                {orgDetails?.role && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="flex items-center gap-1">
                      {orgDetails.role === "admin" ? (
                        <Shield className="w-4 h-4 text-yellow-600" />
                      ) : orgDetails.role === "moderator" ? (
                        <Shield className="w-4 h-4 text-blue-600" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-muted-foreground" />
                      )}
                      {orgDetails.role.charAt(0).toUpperCase() +
                        orgDetails.role.slice(1)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              className="pl-10 bg-background/50"
            />
          </div>
        </div>
        {/* Groups Section */}
        <div className="px-4 flex items-center justify-between mt-2 mb-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Groups
          </h2>
          <Button
            size="icon"
            variant="ghost"
            className="p-1"
            onClick={() => setCreateGroupDialogOpen(true)}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex flex-col gap-2 px-4 pb-2">
          {groupsLoading ? (
            <div className="text-xs text-muted-foreground">Loading...</div>
          ) : groups.length === 0 ? (
            <div className="text-xs text-muted-foreground  italic">
              No Groups Available
            </div>
          ) : (
            groups.map((group) => {
              const memberCount = group.members?.length || 0;
              const lastActivity = group.lastActivity || group.createdAt;
              const timeAgo = lastActivity ? formatTimeAgo(new Date(lastActivity.seconds ? lastActivity.seconds * 1000 : lastActivity)) : null;
              
              const isSelected = selectedGroupId === group.id;
              
              return (
                <div
                  key={group.id}
                  className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? "bg-primary/10 border-l-4 border-primary rounded-r-sm rounded-l-none" 
                      : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    if (onGroupSelect) {
                      onGroupSelect(group, org);
                    }
                    // Close sidebar on mobile when selecting a group
                    if (isMobile && setSidebarOpen) {
                      setSidebarOpen(false);
                    }
                  }}>
                  <Avatar className="w-7 h-7 mt-0.5">
                    <AvatarImage src={group.avatar} alt={group.name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {group.name?.charAt(0).toUpperCase() || "G"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {group.name || group.id}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Users className="w-3 h-3 flex-shrink-0" />
                      <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                      {timeAgo && (
                        <>
                          <span className="mx-1">•</span>
                          <span className="truncate">{timeAgo}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Chat Section: Use real data if available */}
        <div className="px-4 py-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Members
          </h2>
        </div>
        <div className="flex flex-col gap-1 px-4 pb-2">
          {membersLoading ? (
            <div className="text-xs text-muted-foreground">Loading...</div>
          ) : members.filter((member) => member.userId !== userId).length ===
            0 ? (
            <div className="text-xs text-muted-foreground  italic">
              No members in this organization.
            </div>
          ) : (
            members
              .filter((member) => member.userId !== userId)
              .sort((a, b) => {
                const roleA = a.role || "member";
                const roleB = b.role || "member";
                return roleOrder[roleA] - roleOrder[roleB];
              })
              .map((member, idx) => {
                const profile = userProfiles[member.userId] || {};
                const displayName =
                  profile.displayName || member.userId || `Member ${idx + 1}`;
                const avatarUrl = profile.avatar || "";
                const status = memberStatuses[member.userId];
                const isOnline = status?.isOnline && new Date().getTime() - status.lastSeen.toDate().getTime() < 300000; // 5 minutes
                
                // Check if this member's conversation is currently selected
                const isSelected = selectedConversationId && selectedConversationId.includes(member.userId);

                return (
                  <div
                    key={member.userId || idx}
                    onClick={() => handleMemberClick(member)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? "bg-primary/10 border-l-4 border-primary rounded-r-sm rounded-l-none" 
                        : "hover:bg-muted"
                    }`}>
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
                        title={isOnline ? 'Online' : 'Offline'}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-foreground truncate">
                        {displayName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {member.role ? `Role: ${member.role}` : "Member"}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
      {/* Global button above Feed section */}
      <div className="px-4 pb-2 flex justify-end">
        <Button
          size="icon"
          className="rounded-full bg-black text-white hover:bg-neutral-800"
          onClick={() => {
            // Go back to normal sidebar
            if (onBack) onBack();
            // Navigate to Your Feed page
            if (onYourFeedClick) onYourFeedClick();
          }}
          aria-label="Global">
          <Globe className="w-5 h-5" />
        </Button>
      </div>
      {/* Feed button fixed at bottom for org view */}
      <div className="sticky bottom-0 w-full bg-chat-sidebar p-4 border-t border-border flex justify-center z-20">
        <Button
          className="w-full font-semibold text-base"
          variant="default"
          onClick={onFeedClick}>
          Feed
        </Button>
      </div>
      
      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={createGroupDialogOpen}
        onOpenChange={setCreateGroupDialogOpen}
        org={org}
        userId={userId}
        onSuccess={refreshGroups}
      />
    </div>
  );
};
