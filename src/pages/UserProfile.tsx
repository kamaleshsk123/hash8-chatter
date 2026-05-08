import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Camera,
  Edit3,
  Save,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Users,
  MessageSquare,
  Shield,
  Settings,
  Sun,
  Moon,
  Monitor,
  CreditCard,
  BadgeCheck,
  Loader2,
  Bell,
  Globe,
  Clock,
  Lock,
  Edit2
} from "lucide-react";
import { requestNotificationPermission } from "@/services/notifications";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { uploadImageToCloudinary } from "@/services/cloudinary";
import { updateUserProfile, getUserOrganizations, getUserRoleInOrganization, resetPassword, signOutUser } from "@/services/firebase";

interface UserProfileProps {
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("about");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    jobTitle: user?.jobTitle || "",
    department: user?.department || "",
    bio: user?.bio || "",
    location: user?.location || "",
    notifications: {
      desktop: user?.notifications?.desktop ?? true,
      pushEnabled: user?.notifications?.pushEnabled ?? false,
      sound: user?.notifications?.sound ?? true,
      email: user?.notifications?.email ?? false,
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const avatarUrl = await uploadImageToCloudinary(file);
        await updateUserProfile(user.uid, { avatar: avatarUrl });
        await refreshUser(); // Refresh user data from AuthContext
        toast({ title: "Success", description: "Profile picture updated." });
      } catch {
        toast({ title: "Error", description: "Failed to update profile picture." });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateUserProfile(user.uid, formData);
      await refreshUser(); // Refresh user data from AuthContext
      setIsEditing(false);
      toast({ title: "Success", description: "Profile updated successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to update profile." });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const handleRequestPermission = async () => {
    if (!user) return;
    const token = await requestNotificationPermission(user.uid);
    if (token) {
      setFormData(prev => ({
        ...prev,
        notifications: { ...prev.notifications, pushEnabled: true }
      }));
      toast({
        title: "Notifications Enabled",
        description: "You will now receive desktop notifications.",
      });
    } else {
      toast({
        title: "Permission Denied",
        description: "Please enable notifications in your browser settings.",
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      toast({ 
        title: "Reset Link Sent", 
        description: `A password reset email has been sent to ${user.email}.` 
      });
    } catch {
      toast({ title: "Error", description: "Failed to send reset email.", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      onClose();
      toast({ title: "Signed out", description: "You have been signed out." });
    } catch {
      toast({ title: "Error", description: "Failed to sign out.", variant: "destructive" });
    }
  };

  // Fetch user organizations when component mounts or when organizations tab is accessed
  const fetchUserOrganizations = async () => {
    if (!user?.uid) return;
    
    setOrganizationsLoading(true);
    try {
      const userOrgs = await getUserOrganizations(user.uid);
      
      // Get role for each organization
      const orgsWithRoles = await Promise.all(
        userOrgs.map(async (org) => {
          const role = await getUserRoleInOrganization(user.uid, org.id);
          return { ...org, userRole: role };
        })
      );
      
      setOrganizations(orgsWithRoles);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast({ title: "Error", description: "Failed to load organizations." });
    } finally {
      setOrganizationsLoading(false);
    }
  };

  // Fetch organizations when switching to organizations tab
  React.useEffect(() => {
    if (activeTab === "organizations" && organizations.length === 0) {
      fetchUserOrganizations();
    }
  }, [activeTab, user?.uid]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-6">
            {/* Profile Avatar */}
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="icon"
                className="absolute -bottom-2 -right-2 rounded-full bg-background"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
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

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {user?.name || "User"}
                </h1>
                <Badge variant="outline" className="bg-status-online/10 text-status-online border-status-online">
                  Online
                </Badge>
              </div>
              <p className="text-muted-foreground mb-1">
                {user?.jobTitle || "No job title set"}
              </p>
              <p className="text-sm text-muted-foreground">
                {user?.email}
              </p>
            </div>

            {/* Edit Button */}
            <Button
              variant={isEditing ? "destructive" : "default"}
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                  setFormData({
                    name: user?.name || "",
                    email: user?.email || "",
                    phone: user?.phone || "",
                    jobTitle: user?.jobTitle || "",
                    department: user?.department || "",
                    bio: user?.bio || "",
                    location: user?.location || "",
                    notifications: {
                      desktop: user?.notifications?.desktop ?? true,
                      pushEnabled: user?.notifications?.pushEnabled ?? false,
                      sound: user?.notifications?.sound ?? true,
                      email: user?.notifications?.email ?? false,
                    }
                  });
                } else {
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      {isEditing ? (
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">{user?.name || "Not set"}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      {isEditing ? (
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          placeholder="Enter phone number"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{user?.phone || "Not set"}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      {isEditing ? (
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => handleInputChange("location", e.target.value)}
                          placeholder="Enter location"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{user?.location || "Not set"}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Job Title</Label>
                      {isEditing ? (
                        <Input
                          id="jobTitle"
                          value={formData.jobTitle}
                          onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                          placeholder="Enter job title"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{user?.jobTitle || "Not set"}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      {isEditing ? (
                        <Input
                          id="department"
                          value={formData.department}
                          onChange={(e) => handleInputChange("department", e.target.value)}
                          placeholder="Enter department"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">{user?.department || "Not set"}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    {isEditing ? (
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => handleInputChange("bio", e.target.value)}
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {user?.bio || "No bio available"}
                      </p>
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveProfile}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Member Since</Label>
                      <p className="text-sm text-muted-foreground">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                      </p>
                    </div>
                    <div>
                      <Label>Last Seen</Label>
                      <p className="text-sm text-muted-foreground">
                        {user?.lastSeen ? new Date(user.lastSeen).toLocaleDateString() : "Recently"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Organizations Tab */}
            <TabsContent value="organizations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Your Organizations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {organizationsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-muted-foreground">Loading organizations...</div>
                    </div>
                  ) : organizations.length === 0 ? (
                    <div className="text-center py-8">
                      <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">You are not a member of any organizations yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {organizations.map((org) => (
                        <div
                          key={org.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{org.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {org.description || "No description available"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                org.userRole === "admin"
                                  ? "default"
                                  : org.userRole === "moderator"
                                  ? "secondary"
                                  : "outline"
                              }
                              className={
                                org.userRole === "admin"
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                  : org.userRole === "moderator"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : "bg-gray-100 text-gray-800 border-gray-200"
                              }
                            >
                              {org.userRole === "admin" && <Shield className="h-3 w-3 mr-1" />}
                              {org.userRole === "moderator" && <Shield className="h-3 w-3 mr-1" />}
                              {org.userRole === "member" && <Users className="h-3 w-3 mr-1" />}
                              {org.userRole || "Member"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Organizations</p>
                      <p className="text-2xl font-bold">{organizations.length}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Member Since</p>
                      <p className="text-lg font-bold">
                        {user?.createdAt ? new Date(user.createdAt).getFullYear() : "2026"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs text-muted-foreground uppercase">Recent Activity</Label>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Profile Updated</p>
                        <p className="text-xs text-muted-foreground">Just now</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Theme Settings */}
                  <div className="space-y-4">
                    <Label>Theme</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("light")}
                      >
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("dark")}
                      >
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </Button>
                      <Button
                        variant={theme === "system" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("system")}
                      >
                        <Monitor className="h-4 w-4 mr-2" />
                        System
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Notification Settings */}
                  <div className="space-y-4">
                    <Label>Notifications</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Push Notifications</p>
                          <p className="text-xs text-muted-foreground">Receive browser notifications</p>
                        </div>
                        <Switch 
                          checked={formData.notifications.pushEnabled}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleRequestPermission();
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                notifications: { ...prev.notifications, pushEnabled: false }
                              }));
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Sound Notifications</p>
                          <p className="text-xs text-muted-foreground">Play sound for new messages</p>
                        </div>
                        <Switch 
                          checked={formData.notifications.sound}
                          onCheckedChange={(checked) => handleNotificationChange("sound", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Email Notifications</p>
                          <p className="text-xs text-muted-foreground">Receive email for important updates</p>
                        </div>
                        <Switch 
                          checked={formData.notifications.email}
                          onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Security & Privacy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Password Management</p>
                        <p className="text-xs text-muted-foreground">Update your account password</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleResetPassword}>
                        Reset Password
                      </Button>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-destructive">Account Session</p>
                        <p className="text-xs text-muted-foreground">End your current session</p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={handleSignOut}>
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
};
