import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Users, Search, X, UserPlus, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getOrganizationMembers,
  getUsersByIds,
  createGroup,
} from "@/services/firebase";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: any; // Organization object
  userId: string; // Current user ID
  onSuccess?: () => void; // Callback when group is created successfully
}

interface Member {
  userId: string;
  role: string;
  joinedAt: Date;
}

interface UserProfile {
  userId: string;
  displayName: string;
  avatar?: string;
}

export const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({
  open,
  onOpenChange,
  org,
  userId,
  onSuccess,
}) => {
  const { toast } = useToast();

  // Form state
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Data state
  const [members, setMembers] = useState<Member[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setGroupName("");
      setGroupDescription("");
      setSelectedMembers(new Set([userId])); // Always include current user
      setSearchTerm("");
      fetchMembers();
    }
  }, [open, userId]);

  // Fetch organization members and their profiles
  const fetchMembers = async () => {
    if (!org?.id) return;

    setLoading(true);
    try {
      const orgMembers = await getOrganizationMembers(org.id);
      setMembers(orgMembers);

      // Fetch user profiles
      const userIds = orgMembers
        .map((member: Member) => member.userId)
        .filter(Boolean);
      if (userIds.length > 0) {
        const profiles = await getUsersByIds(userIds);
        const profileMap: Record<string, UserProfile> = {};
        profiles.forEach((profile: any) => {
          profileMap[profile.userId] = profile;
        });
        setUserProfiles(profileMap);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      toast({
        title: "Error",
        description: "Failed to load organization members.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter members based on search term
  const filteredMembers = members.filter((member) => {
    const profile = userProfiles[member.userId];
    const displayName = profile?.displayName || member.userId || "";
    return displayName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Handle member selection
  const toggleMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      // Don't allow removing the current user (group creator)
      if (memberId !== userId) {
        newSelected.delete(memberId);
      }
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleSelectAll = () => {
    const allFilteredMemberIds = filteredMembers.map((member) => member.userId);
    setSelectedMembers(new Set([...selectedMembers, ...allFilteredMemberIds]));
  };

  const handleDeselectAll = () => {
    const newSelected = new Set(selectedMembers);
    const filteredMemberIds = filteredMembers.map((member) => member.userId);
    filteredMemberIds.forEach((memberId) => {
      if (memberId !== userId) {
        newSelected.delete(memberId);
      }
    });
    setSelectedMembers(newSelected);
  };

  // Handle form submission
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required.",
        variant: "destructive",
      });
      return;
    }

    if (selectedMembers.size < 2) {
      toast({
        title: "Error",
        description: "Please select at least one other member for the group.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      // Create the group
      await createGroup({
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        organizationId: org.id,
        members: Array.from(selectedMembers),
        createdBy: userId,
      });

      toast({
        title: "Success",
        description: `Group "${groupName}" created successfully!`,
      });

      // Reset form and close dialog
      onOpenChange(false);

      // Call success callback to refresh the groups list
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to create group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Create New Group
          </DialogTitle>
          <DialogDescription>
            Create a new group in {org?.name} and add members to start chatting.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name *</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="group-name"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="pl-10 focus:outline-none focus:ring-0"
                maxLength={50}
              />
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {groupName.length}/50
            </div>
          </div>

          {/* Group Description */}
          <div className="space-y-2">
            <Label htmlFor="group-description">Description (Optional)</Label>
            <Textarea
              id="group-description"
              placeholder="What's this group about?"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              className="min-h-[60px] resize-none focus:outline-none focus:ring-0"
              maxLength={200}
            />
            <div className="text-xs text-muted-foreground text-right">
              {groupDescription.length}/200
            </div>
          </div>

          <Separator />

          {/* Members Selection */}
          <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between">
              <Label>Add Members</Label>
              <div className="text-xs text-muted-foreground">
                {selectedMembers.size} selected
              </div>
            </div>

            {/* Search and Select All/Deselect All */}
            <div className="flex items-center justify-between gap-4">
              {/* Search Members */}
              <div className="relative w-1/2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Select/Deselect Buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Deselect All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-primary text-white hover:bg-primary/90"
                  onClick={handleSelectAll}
                >
                  Select All
                </Button>
              </div>
            </div>

            {/* Members List */}
            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-3 space-y-2">
                {loading ? (
                  <div className="text-center text-muted-foreground py-4">
                    Loading members...
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    {searchTerm
                      ? "No members found matching your search."
                      : "No members available."}
                  </div>
                ) : (
                  filteredMembers.map((member) => {
                    const profile = userProfiles[member.userId] || {};
                    const displayName =
                      profile.displayName || member.userId || "Unknown User";
                    const isCurrentUser = member.userId === userId;
                    const isSelected = selectedMembers.has(member.userId);

                    return (
                      <div
                        key={member.userId}
                        className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/10 border border-primary/20"
                            : ""
                        }`}
                        onClick={() => toggleMember(member.userId)}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={isCurrentUser}
                          onChange={() => toggleMember(member.userId)}
                        />
                        <Avatar className="w-8 h-8">
                          {profile.avatar ? (
                            <img
                              src={profile.avatar}
                              alt={displayName}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {displayName}
                            </span>
                            {isCurrentUser && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {member.role === "admin" ? "Admin" : "Member"}
                          </div>
                        </div>
                        {isSelected && !isCurrentUser && (
                          <X className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateGroup}
            disabled={creating || !groupName.trim() || selectedMembers.size < 2}
            className="w-full sm:w-auto"
          >
            {creating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Create Group
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
