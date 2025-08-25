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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Users, Search, X, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getOrganizationMembers,
  getUsersByIds,
  inviteToGroup,
} from "@/services/firebase";

interface InviteToGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: any; // Organization object
  group: any; // Group object
  userId: string; // Current user ID
  onSuccess?: () => void; // Callback when invitation is sent successfully
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

export const InviteToGroupDialog: React.FC<InviteToGroupDialogProps> = ({
  open,
  onOpenChange,
  org,
  group,
  userId,
  onSuccess,
}) => {
  const { toast } = useToast();

  // Form state
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
  const [inviting, setInviting] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedMembers(new Set());
      setSearchTerm("");
      fetchMembers();
    }
  }, [open]);

  // Fetch organization members and their profiles
  const fetchMembers = async () => {
    if (!org?.id) return;

    setLoading(true);
    try {
      const orgMembers = await getOrganizationMembers(org.id);
      // Filter out members who are already in the group
      const nonGroupMembers = orgMembers.filter(
        (member: Member) => !group.members.includes(member.userId)
      );
      setMembers(nonGroupMembers);

      // Fetch user profiles
      const userIds = nonGroupMembers
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
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  // Handle form submission
  const handleInvite = async () => {
    if (selectedMembers.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one member to invite.",
        variant: "destructive",
      });
      return;
    }

    setInviting(true);
    try {
      // Invite members to the group
      await inviteToGroup({
        organizationId: org.id,
        groupId: group.id,
        members: Array.from(selectedMembers),
        invitedBy: userId,
      });

      toast({
        title: "Success",
        description: `Invitations sent successfully!`,
      });

      // Reset form and close dialog
      onOpenChange(false);

      // Call success callback to refresh the groups list
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error inviting members:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to invite members. Please try again.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Members to {group?.name}</DialogTitle>
          <DialogDescription>
            Select members from your organization to invite to this group.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          {/* Search Members */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Members List */}
          <div className="flex-grow overflow-auto border rounded-md">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {loading ? (
                  <p>Loading members...</p>
                ) : (
                  filteredMembers.map((member) => {
                    const profile = userProfiles[member.userId];
                    return (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                        onClick={() => toggleMember(member.userId)}
                      >
                        <div className="flex items-center space-x-2">
                          <Avatar>
                            <AvatarFallback>
                              {profile?.displayName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span>{profile?.displayName || member.userId}</span>
                        </div>
                        <Checkbox checked={selectedMembers.has(member.userId)} />
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={inviting}>
            {inviting ? "Inviting..." : "Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
