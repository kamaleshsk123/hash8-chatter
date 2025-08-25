import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { uploadImageToCloudinary as uploadToCloudinary } from "@/services/cloudinary";
import { updateGroup, sendSystemMessage } from "@/services/firebase";
import { Camera, X, Users } from "lucide-react";

interface GroupInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: any;
  org: any;
  members: User[];
  onSuccess: (updatedGroup: any) => void;
}

export const GroupInfoSheet: React.FC<GroupInfoSheetProps> = ({
  open,
  onOpenChange,
  group,
  org,
  members,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const avatarUrl = await uploadToCloudinary(file);
        await updateGroup({
          organizationId: org.id,
          groupId: group.id,
          updates: { avatar: avatarUrl },
        });
        onSuccess({ ...group, avatar: avatarUrl });

        if (user) {
          await sendSystemMessage({
            organizationId: org.id,
            groupId: group.id,
            text: `Group image was changed by ${user.name || user.email}.`,
          });
        }
        toast({ title: "Success", description: "Group image updated." });
      } catch {
        toast({ title: "Error", description: "Failed to update group image." });
      }
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateGroup({
        organizationId: org.id,
        groupId: group.id,
        updates: { avatar: "" },
      });
      onSuccess({ ...group, avatar: "" });

      if (user) {
        await sendSystemMessage({
          organizationId: org.id,
          groupId: group.id,
          text: `Group image was removed by ${user.name || user.email}.`,
        });
      }
      toast({ title: "Success", description: "Group image removed." });
    } catch {
      toast({ title: "Error", description: "Failed to remove group image." });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="space-y-6">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Group Info</SheetTitle>
        </SheetHeader>

        {/* Hero Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-28 h-28 shadow-md hover:scale-105 transition">
              <AvatarImage src={group?.avatar} alt={group?.name} />
              <AvatarFallback className="text-4xl bg-primary/10">
                {group?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
              accept="image/*"
            />
          </div>

          {/* Group Name + Description */}
          <div className="text-center">
            <h2 className="text-2xl font-bold">{group?.name}</h2>
            <p className="text-muted-foreground max-w-xs mx-auto">
              {group?.description || "No description provided"}
            </p>
          </div>

          {/* Image Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-2" />
              Change Image
            </Button>
            {group?.avatar && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveAvatar}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Members Section */}
        {/* Members Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-medium">Members</h3>
          </div>

          {/* Slack-like stacked avatars */}
          <div className="flex items-center">
            {members.slice(0, 5).map((m, index) => (
              <div
                key={m.id}
                className="relative"
                style={{ marginLeft: index === 0 ? 0 : "-12px" }} // overlap effect
              >
                <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
                  <AvatarImage src={m.avatar} alt={m.name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(m.displayName || m.name || m.email)?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            ))}

            {/* Extra count if more than 5 */}
            {members.length > 5 && (
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-sm font-medium border-2 border-background shadow-sm"
                style={{ marginLeft: "-12px" }}
              >
                +{members.length - 5}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
