import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { uploadImageToCloudinary as uploadToCloudinary } from "@/services/cloudinary";
import { updateGroup, sendSystemMessage } from "@/services/firebase";
import { Camera } from "lucide-react";

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
        
        // Send system message to chat
        if (user) {
          await sendSystemMessage({
            organizationId: org.id,
            groupId: group.id,
            text: `Group image was changed by ${user.name || user.email}.`,
          });
        }

        toast({ title: "Success", description: "Group image updated." });
      } catch (error) {
        console.error("Error uploading image:", error);
        toast({ title: "Error", description: "Failed to update group image." });
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Group Info</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={group?.avatar} alt={group?.name} />
                <AvatarFallback className="text-4xl">
                  {group?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="icon"
                className="absolute bottom-0 right-0 rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
              />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">{group?.name}</h2>
              <p className="text-muted-foreground">{group?.description}</p>
            </div>
          </div>
          
        </div>
      </SheetContent>
    </Sheet>
  );
};
