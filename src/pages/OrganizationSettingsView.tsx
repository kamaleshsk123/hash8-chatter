import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Edit,
  Save,
  Copy,
  Users,
  Shield,
  User as UserIcon,
  Mail,
  Trash2,
  ArrowLeft,
  QrCode,
  Crown,
  AlertTriangle,
  MoreVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "react-qr-code";
import {
  getOrganizationMembers,
  getUsersByIds,
  getUserRoleInOrganization,
  updateOrganization,
  removeMemberFromOrganization,
} from "@/services/firebase";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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

interface OrganizationSettingsViewProps {
  org: any;
  orgDetails: {
    role: string | null;
    memberCount: number | null;
    loading: boolean;
  };
  userId: string;
  onBack: () => void;
  onOrganizationUpdate?: (updatedOrg: any) => void;
}

export const OrganizationSettingsView: React.FC<
  OrganizationSettingsViewProps
> = ({ org, orgDetails, userId, onBack, onOrganizationUpdate }) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(org?.name || "");
  const [editedDescription, setEditedDescription] = useState(
    org?.description || ""
  );
  const [members, setMembers] = useState<any[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [membersLoading, setMembersLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [removingMember, setRemovingMember] = useState(false);

  const isAdmin = orgDetails?.role === "admin";

  // Fetch members when component mounts
  useEffect(() => {
    if (!org?.id) return;
    setMembersLoading(true);
    getOrganizationMembers(org.id)
      .then(async (members) => {
        setMembers(members);
        // Fetch user profiles for all member userIds
        const userIds = members.map((m: any) => m.userId).filter(Boolean);
        if (userIds.length) {
          const profiles = await getUsersByIds(userIds);
          const profileMap: Record<string, any> = {};
          profiles.forEach((p: any) => {
            profileMap[p.userId] = p;
          });
          setUserProfiles(profileMap);
        }
      })
      .finally(() => setMembersLoading(false));
  }, [org?.id]);

  const handleSave = async () => {
    if (!org?.id) return;

    setSaving(true);
    try {
      const updates: { name?: string; description?: string } = {};

      if (editedName !== org.name) {
        updates.name = editedName;
      }

      if (editedDescription !== org.description) {
        updates.description = editedDescription;
      }

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      await updateOrganization(org.id, updates);

      // Update local org object
      const updatedOrg = { ...org, ...updates };

      // Call callback to update parent components
      if (onOrganizationUpdate) {
        onOrganizationUpdate(updatedOrg);
      }

      toast({
        title: "Changes saved",
        description: "Organization details have been updated successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating organization:", error);
      toast({
        title: "Error",
        description: "Failed to update organization details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUID = () => {
    navigator.clipboard.writeText(org?.id || "");
    toast({
      title: "UID copied",
      description: "Organization UID has been copied to clipboard.",
    });
  };

  const handleInviteMember = () => {
    // TODO: Implement invite functionality
    toast({
      title: "Invite sent",
      description: "Invitation has been sent successfully.",
    });
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !org?.id) return;

    setRemovingMember(true);
    try {
      await removeMemberFromOrganization(org.id, memberToRemove.userId);

      // Update local members list
      setMembers((prev) =>
        prev.filter((m) => m.userId !== memberToRemove.userId)
      );

      // Update user profiles
      setUserProfiles((prev) => {
        const newProfiles = { ...prev };
        delete newProfiles[memberToRemove.userId];
        return newProfiles;
      });

      toast({
        title: "Member removed",
        description:
          "The member has been successfully removed from the organization.",
      });

      setMemberToRemove(null);
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRemovingMember(false);
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-green-100 text-green-700",
      "bg-yellow-100 text-yellow-700",
      "bg-red-100 text-red-700",
      "bg-purple-100 text-purple-700",
      "bg-pink-100 text-pink-700",
      "bg-indigo-100 text-indigo-700",
      "bg-teal-100 text-teal-700",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="lg:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">
            Organization Settings
          </h1>
        </div>
        {isAdmin && isEditing && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setEditedName(org?.name || "");
                setEditedDescription(org?.description || "");
              }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Organization Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Organization Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar and Name */}
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className={getAvatarColor(org?.name || "")}>
                  {org?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-lg font-semibold"
                    />
                  ) : (
                    <h2 className="text-lg font-semibold text-foreground">
                      {org?.name}
                    </h2>
                  )}
                  {isAdmin && !isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    {isAdmin ? (
                      <>
                        <Crown className="w-3 h-3" />
                        Admin
                      </>
                    ) : (
                      <>
                        <UserIcon className="w-3 h-3" />
                        Member
                      </>
                    )}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {orgDetails?.memberCount || 0} members
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              {isEditing ? (
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Describe your organization..."
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {org?.description || "No description provided."}
                </p>
              )}
            </div>

            {/* Organization UID, Copy, QR: Only for Admins */}
            {isAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Organization UID
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={org?.id || ""}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyUID}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowQR(!showQR)}>
                    <QrCode className="w-4 h-4" />
                  </Button>
                </div>
                {showQR && (
                  <div className="flex justify-center p-4 bg-muted rounded-lg">
                    <QRCode value={org?.id || ""} size={128} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Members ({orgDetails?.memberCount || 0})
              </span>
              {isAdmin && (
                <Button onClick={handleInviteMember} size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading members...
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const profile = userProfiles[member.userId] || {};
                  const displayName =
                    profile.displayName || member.userId || "Unknown User";
                  const isCurrentUser = member.userId === userId;

                  return (
                    <div
                      key={member.userId}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isCurrentUser
                          ? "bg-primary/5 border-primary/20"
                          : "bg-background"
                      }`}>
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate">
                            {displayName}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {member.role === "admin" ? (
                              <>
                                <Crown className="w-3 h-3 mr-1" />
                                Admin
                              </>
                            ) : (
                              <>
                                <UserIcon className="w-3 h-3 mr-1" />
                                Member
                              </>
                            )}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Joined{" "}
                            {new Date(
                              member.joinedAt?.toDate?.() || member.joinedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {isAdmin && !isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onClick={() => setMemberToRemove(member)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Only Section */}
        {isAdmin && (
          <Card className="border border-destructive/30 bg-red-50 dark:bg-red-900/30 rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive font-bold">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="destructive"
                size="sm"
                className="w-full shadow-md transition-transform">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Organization
              </Button>
              <p className="text-xs text-destructive/80">
                This action cannot be undone. All data will be permanently
                deleted.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold">
                {(memberToRemove &&
                  userProfiles[memberToRemove.userId]?.displayName) ||
                  memberToRemove?.userId}
              </span>{" "}
              from the organization? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingMember}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={removingMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removingMember ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
