import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GroupListItem } from "@/components/GroupListItem";
import { Plus, Search, Settings, Sun, Moon, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Group, Message, TypingStatus } from "@/types";
import React from "react";

interface ChatSidebarProps {
  user: any;
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
  handleSignOut: () => void;
  mockGroups: Group[];
  mockChats: any[];
  selectedGroup: Group | null;
  selectedChat: any;
  handleSelectGroup: (group: Group) => void;
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
  mockGroups,
  mockChats,
  selectedGroup,
  selectedChat,
  handleSelectGroup,
  handleSelectChat,
  onFeedClick,
}) => (
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
    {/* Groups List */}
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Groups
        </h2>
        <Button variant="ghost" size="sm">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div className="space-y-1">
        {mockGroups.map((group) => (
          <GroupListItem
            key={group.id}
            group={group}
            isSelected={selectedGroup?.id === group.id && !selectedChat}
            onClick={() => handleSelectGroup(group)}
          />
        ))}
      </div>
      {/* Chats List */}
      <div className="px-4 py-2 flex items-center justify-between mt-6">
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
  </motion.div>
);
