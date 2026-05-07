import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  Search, 
  User, 
  Building2, 
  MessageSquare, 
  Hash,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { searchUsers, getUserOrganizations } from "@/services/firebase";
import { searchGlobalMessages, searchOrgPosts } from "@/services/search";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GlobalSearchProps {
  onSelectResult: (type: 'chat' | 'feed' | 'direct_message' | 'your-feed', id: string, extra?: any) => void;
  currentOrgId?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectResult, currentOrgId }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    users: any[];
    orgs: any[];
    messages: any[];
    posts: any[];
  }>({ users: [], orgs: [], messages: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ users: [], orgs: [], messages: [], posts: [] });
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const [users, orgs, messages, posts] = await Promise.all([
          searchUsers(query),
          getUserOrganizations(user?.uid || '').then(allOrgs => 
            allOrgs.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
          ),
          searchGlobalMessages(query),
          currentOrgId ? searchOrgPosts(currentOrgId, query) : Promise.resolve([])
        ]);
        setResults({ users, orgs, messages, posts });
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, user?.uid]);

  const handleSelectUser = (selectedUser: any) => {
    setOpen(false);
    onSelectResult('direct_message', selectedUser.userId, selectedUser);
  };

  const handleSelectOrg = (org: any) => {
    setOpen(false);
    onSelectResult('feed', org.id);
  };

  const handleSelectMessage = (msg: any) => {
    setOpen(false);
    // Navigate to chat/dm where the message belongs
    // For now, we'll try to find if it has a groupId or convId
    if (msg.groupId) {
      onSelectResult('chat', msg.groupId, { orgId: msg.organizationId });
    } else {
      // Default to direct message if no groupId
      onSelectResult('direct_message', msg.senderId);
    }
  };

  const handleSelectPost = (post: any) => {
    setOpen(false);
    onSelectResult('feed', currentOrgId || '');
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search members, organizations..." 
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          {results.orgs.length > 0 && (
            <CommandGroup heading="Organizations">
              {results.orgs.map((org) => (
                <CommandItem
                  key={org.id}
                  onSelect={() => handleSelectOrg(org)}
                  className="flex items-center gap-2"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>{org.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.users.length > 0 && (
            <CommandGroup heading="Members">
              {results.users.map((u) => (
                <CommandItem
                  key={u.userId}
                  onSelect={() => handleSelectUser(u)}
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback>{u.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{u.name}</span>
                    <span className="text-xs text-muted-foreground">{u.jobTitle || 'Member'}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.messages.length > 0 && (
            <CommandGroup heading="Messages">
              {results.messages.map((msg) => (
                <CommandItem
                  key={msg.id}
                  onSelect={() => handleSelectMessage(msg)}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm truncate">{msg.text}</span>
                    <span className="text-[10px] text-muted-foreground">
                      from {msg.senderName} • {formatDistanceToNow(msg.timestamp instanceof Date ? msg.timestamp : (msg.timestamp as any)?.toDate?.() || new Date(), { addSuffix: true })}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.posts.length > 0 && (
            <CommandGroup heading="Feed Posts">
              {results.posts.map((post) => (
                <CommandItem
                  key={post.id}
                  onSelect={() => handleSelectPost(post)}
                  className="flex items-center gap-2"
                >
                  <Hash className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm truncate">{post.content}</span>
                    <span className="text-[10px] text-muted-foreground">
                      in Feed • {formatDistanceToNow(post.createdAt instanceof Date ? post.createdAt : (post.createdAt as any)?.toDate?.() || new Date(), { addSuffix: true })}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!query && (
            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={() => { setOpen(false); onSelectResult('your-feed', ''); }}>
                <Clock className="mr-2 h-4 w-4" />
                <span>Recent Feed</span>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};
