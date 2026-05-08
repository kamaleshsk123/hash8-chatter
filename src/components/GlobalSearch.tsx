import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Search, 
  Building2, 
  MessageSquare, 
  Hash,
  Users,
  Loader2,
  Command as CommandIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { searchUsers, getUserOrganizations, searchGroups } from "@/services/firebase";
import { searchOrgPosts } from "@/services/search";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GlobalSearchProps {
  onSelectResult: (type: 'chat' | 'feed' | 'direct_message' | 'your-feed', id: string, extra?: any) => void;
  currentOrgId?: string;
}

interface SearchResults {
  users: any[];
  orgs: any[];
  groups: any[];
  posts: any[];
}

const EMPTY_RESULTS: SearchResults = { users: [], orgs: [], groups: [], posts: [] };

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectResult, currentOrgId }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build a flat list of all results for keyboard navigation
  const flatResults = useCallback(() => {
    const items: { type: string; data: any }[] = [];
    results.orgs.forEach(o => items.push({ type: 'org', data: o }));
    results.groups.forEach(g => items.push({ type: 'group', data: g }));
    results.users.forEach(u => items.push({ type: 'user', data: u }));
    results.posts.forEach(p => items.push({ type: 'post', data: p }));
    return items;
  }, [results]);

  // Keyboard shortcut to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults(EMPTY_RESULTS);
      setSelectedIndex(0);
    } else {
      // Focus input when opened
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Perform search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(EMPTY_RESULTS);
      setSelectedIndex(0);
      return;
    }

    const controller = new AbortController();

    const performSearch = async () => {
      setLoading(true);
      try {
        const [users, orgs, posts, groups] = await Promise.all([
          searchUsers(query).catch(() => []),
          getUserOrganizations(user?.uid || '').then(allOrgs =>
            allOrgs.filter(o => o.name?.toLowerCase().includes(query.toLowerCase()))
          ).catch(() => []),
          (currentOrgId ? searchOrgPosts(currentOrgId, query) : Promise.resolve([])).catch(() => []),
          (currentOrgId ? searchGroups(currentOrgId, query) : Promise.resolve([])).catch(() => [])
        ]);

        if (!controller.signal.aborted) {
          setResults({ users, orgs, posts, groups });
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, user?.uid, currentOrgId]);

  // Handle selection
  const handleSelect = useCallback((type: string, data: any) => {
    setOpen(false);
    switch (type) {
      case 'user':
        onSelectResult('direct_message', data.userId, data);
        break;
      case 'org':
        onSelectResult('feed', data.id);
        break;
      case 'group':
        onSelectResult('chat', data.id, { ...data, orgId: currentOrgId });
        break;
      case 'post':
        onSelectResult('feed', currentOrgId || '');
        break;
    }
  }, [onSelectResult, currentOrgId]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = flatResults();
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[selectedIndex];
      if (item) handleSelect(item.type, item.data);
    }
  }, [flatResults, selectedIndex, handleSelect]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const totalResults = results.users.length + results.orgs.length + results.groups.length + results.posts.length;
  let runningIndex = 0;

  const formatTimestamp = (ts: any) => {
    try {
      const date = ts instanceof Date ? ts : ts?.toDate?.() || new Date();
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl gap-0 sm:max-w-[520px] rounded-xl border-border/50">
        <DialogTitle className="sr-only">Global Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search for members, groups, organizations, and messages.
        </DialogDescription>

        {/* Search Input */}
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search members, groups, organizations..."
            className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[300px] overflow-y-auto overflow-x-hidden">
          {/* Empty state — only show when not loading and searched */}
          {!loading && query.length >= 2 && totalResults === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          )}

          {/* Default state — keyboard hint */}
          {!query && (
            <div className="py-6 text-center text-sm text-muted-foreground space-y-2">
              <p>Start typing to search…</p>
              <p className="text-xs flex items-center justify-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <CommandIcon className="h-3 w-3" />K
                </kbd>
                to toggle search
              </p>
            </div>
          )}

          {/* Organizations */}
          {results.orgs.length > 0 && (
            <ResultSection heading="Organizations">
              {results.orgs.map((org) => {
                const idx = runningIndex++;
                return (
                  <ResultItem
                    key={`org-${org.id}`}
                    index={idx}
                    isSelected={selectedIndex === idx}
                    onClick={() => handleSelect('org', org)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{org.name}</span>
                  </ResultItem>
                );
              })}
            </ResultSection>
          )}

          {/* Groups */}
          {results.groups.length > 0 && (
            <ResultSection heading="Groups">
              {results.groups.map((group) => {
                const idx = runningIndex++;
                return (
                  <ResultItem
                    key={`group-${group.id}`}
                    index={idx}
                    isSelected={selectedIndex === idx}
                    onClick={() => handleSelect('group', group)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{group.name}</span>
                  </ResultItem>
                );
              })}
            </ResultSection>
          )}

          {/* Members */}
          {results.users.length > 0 && (
            <ResultSection heading="Members">
              {results.users.map((u) => {
                const idx = runningIndex++;
                return (
                  <ResultItem
                    key={`user-${u.userId}`}
                    index={idx}
                    isSelected={selectedIndex === idx}
                    onClick={() => handleSelect('user', u)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={u.avatar} />
                      <AvatarFallback className="text-xs">{u.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{u.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{u.jobTitle || 'Member'}</span>
                    </div>
                  </ResultItem>
                );
              })}
            </ResultSection>
          )}

          {/* Posts */}
          {results.posts.length > 0 && (
            <ResultSection heading="Feed Posts">
              {results.posts.map((post) => {
                const idx = runningIndex++;
                return (
                  <ResultItem
                    key={`post-${post.id}`}
                    index={idx}
                    isSelected={selectedIndex === idx}
                    onClick={() => handleSelect('post', post)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm truncate">{post.content}</span>
                      <span className="text-[10px] text-muted-foreground">
                        in Feed • {formatTimestamp(post.createdAt)}
                      </span>
                    </div>
                  </ResultItem>
                );
              })}
            </ResultSection>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// -- Sub-components --

const ResultSection: React.FC<{ heading: string; children: React.ReactNode }> = ({ heading, children }) => (
  <div className="overflow-hidden p-1">
    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{heading}</div>
    {children}
  </div>
);

const ResultItem: React.FC<{
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  children: React.ReactNode;
}> = ({ index, isSelected, onClick, onMouseEnter, children }) => (
  <div
    data-index={index}
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    className={`relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors ${
      isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
    }`}
    role="option"
    aria-selected={isSelected}
  >
    {children}
  </div>
);
