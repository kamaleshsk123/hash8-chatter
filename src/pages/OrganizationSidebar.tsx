import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Search,
  Users,
  Shield,
  User as UserIcon,
  Globe,
} from "lucide-react";
import {
  getOrganizationGroups,
  getOrganizationMembers,
  getUsersByIds,
} from "@/services/firebase";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { formatTimeAgo } from "@/lib/time";

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
  onSettingsClick?: () => void; // Callback to open organization settings
  onOrganizationUpdate?: (updatedOrg: any) => void; // Callback for organization updates
  onGroupSelect?: (group: any, org: any) => void; // Callback when a group is selected
  selectedGroupId?: string; // Currently selected group ID
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
  onSettingsClick,
  onOrganizationUpdate,
  onGroupSelect,
  selectedGroupId,
}) => {
  // Real group and member data
  const [groups, setGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [membersLoading, setMembersLoading] = useState(false);
  const [isNotMember, setIsNotMember] = useState(false);
  
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
    // console.log("OrganizationSidebar: Fetching data for org:", org.id);
    // console.log("OrganizationSidebar: Current userId:", userId);

    setGroupsLoading(true);
    getOrganizationGroups(org.id)
      .then(setGroups)
      .finally(() => setGroupsLoading(false));
    setMembersLoading(true);
    getOrganizationMembers(org.id)
      .then(async (members) => {
        // console.log("OrganizationSidebar: Fetched members:", members);
        setMembers(members);

        // Check if current user is still a member
        const isCurrentUserMember = members.some(
          (m: any) => m.userId === userId
        );
        // console.log(
        //   "OrganizationSidebar: Is current user member?",
        //   isCurrentUserMember
        // );
        // console.log("OrganizationSidebar: Looking for userId:", userId);
        // console.log(
        //   "OrganizationSidebar: Available member userIds:",
        //   members.map((m: any) => m.userId)
        // );

        if (!isCurrentUserMember) {
          // console.log(
          //   "OrganizationSidebar: User is not a member, setting isNotMember to true"
          // );
          // User is no longer a member, show not member state
          setIsNotMember(true);
          return;
        }

        // console.log(
        //   "OrganizationSidebar: User is still a member, setting isNotMember to false"
        // );
        setIsNotMember(false);

        // Fetch user profiles for all member userIds
        const userIds = members.map((m: any) => m.userId).filter(Boolean);
        if (userIds.length) {
          const profiles = await getUsersByIds(userIds);
          // Map by userId for quick lookup
          const profileMap: Record<string, any> = {};
          profiles.forEach((p: any) => {
            profileMap[p.userId] = p;
          });
          setUserProfiles(profileMap);
        } else {
          setUserProfiles({});
        }
      })
      .finally(() => setMembersLoading(false));
  }, [org?.id, userId]);

  // console.log("OrganizationSidebar: isNotMember state:", isNotMember);
  // console.log("OrganizationSidebar: org:", org);
  // console.log("OrganizationSidebar: userId:", userId);

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
                onBack();
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

  //   console.log("OrganizationSidebar rendered");

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
                        <Shield className="w-4 h-4 text-primary" />
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
            Chat
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
              .map((member, idx) => {
                const profile = userProfiles[member.userId] || {};
                const displayName =
                  profile.displayName || member.userId || `Member ${idx + 1}`;
                const avatarUrl = profile.avatar || "";
                return (
                  <div
                    key={member.userId || idx}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
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
        {/* {console.log("Rendering section: CHAT")} */}
      </div>
      {/* Global button above Feed section */}
      <div className="px-4 pb-2 flex justify-end">
        <Button
          size="icon"
          className="rounded-full bg-black text-white hover:bg-neutral-800"
          onClick={onBack}
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
