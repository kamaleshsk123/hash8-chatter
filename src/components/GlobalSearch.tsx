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
import { searchUsers, getUserOrganizations } from "@/services/firebase";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GlobalSearchProps {
  onSelectResult: (type: 'chat' | 'feed' | 'direct_message' | 'your-feed', id: string, extra?: any) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectResult }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    users: any[];
    orgs: any[];
  }>({ users: [], orgs: [] });
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
      setResults({ users: [], orgs: [] });
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const [users, orgs] = await Promise.all([
          searchUsers(query),
          getUserOrganizations(user?.uid || '').then(allOrgs => 
            allOrgs.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
          )
        ]);
        setResults({ users, orgs });
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
