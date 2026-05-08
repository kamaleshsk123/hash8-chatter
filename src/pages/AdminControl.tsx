import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAllMessages, AdminMessage } from '@/services/admin';
import { 
  Shield, 
  Search, 
  Filter, 
  MessageSquare, 
  User as UserIcon, 
  Clock, 
  ExternalLink,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from '@/components/ui/use-toast';

const AdminControl = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'group' | 'dm'>('all');

  // Security check: Only allow super_admin or specific UID
  const isSuperAdmin = user?.role === 'super_admin' || user?.name === 'Kamalesh' || user?.email === 'admin@hash8.com';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchMessages();
    }
  }, [isSuperAdmin]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const allMsgs = await getAllMessages(500);
      setMessages(allMsgs);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch messages. Ensure you have proper permissions.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4">
        <Shield className="w-16 h-16 text-destructive mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-center max-w-md">
          This area is restricted to Super Administrators only. Your attempt has been logged.
        </p>
        <Button className="mt-6" onClick={() => window.location.href = '/chat'}>
          Return to Safety
        </Button>
      </div>
    );
  }

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.context?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'all') return matchesSearch;
    if (filterType === 'group') return matchesSearch && msg.path.includes('organizations');
    if (filterType === 'dm') return matchesSearch && msg.path.includes('direct_messages');
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between bg-card sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Super Admin Control</h1>
            <p className="text-xs text-muted-foreground">Monitoring all platform communication</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchMessages} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full border">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium">System Live</span>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="p-4 border-b bg-muted/30 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search messages, senders, or groups..." 
            className="pl-10 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter: {filterType.toUpperCase()}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterType('all')}>All Messages</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('group')}>Group Only</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('dm')}>DM Only</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Badge variant="secondary" className="px-3 py-1 text-xs">
            {filteredMessages.length} results
          </Badge>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <Table>
            <TableHeader className="bg-muted/50 rounded-t-xl">
              <TableRow>
                <TableHead className="w-[180px]">Sender</TableHead>
                <TableHead className="w-[150px]">Context</TableHead>
                <TableHead>Message Content</TableHead>
                <TableHead className="w-[140px]">Timestamp</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5} className="h-16 text-center animate-pulse bg-muted/10">
                      Loading data...
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredMessages.length > 0 ? (
                filteredMessages.map((msg) => (
                  <TableRow key={msg.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8 border">
                          <AvatarImage src={msg.senderAvatar} />
                          <AvatarFallback className="text-[10px] bg-primary/10">
                            {msg.senderName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold truncate max-w-[120px]">{msg.senderName}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{msg.senderId}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={msg.path.includes('organizations') ? "default" : "outline"} className="text-[9px] w-fit">
                          {msg.path.includes('organizations') ? 'GROUP' : 'DIRECT'}
                        </Badge>
                        <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[130px]">
                          {msg.context}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xl">
                        {msg.deleted ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="destructive" className="text-[9px] w-fit mb-1">DELETED</Badge>
                            <p className="text-sm leading-relaxed break-words opacity-70 italic line-through">
                              {msg.text}
                            </p>
                            <p className="text-sm leading-relaxed break-words font-medium text-destructive">
                              Original: {msg.originalText || "(No original text captured)"}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed break-words line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
                            {msg.text || <span className="italic text-muted-foreground">No text content (Media/File)</span>}
                          </p>
                        )}
                        {msg.type !== 'text' && (
                          <Badge variant="secondary" className="mt-1 text-[9px]">
                            {msg.type.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(msg.timestamp, 'HH:mm:ss')}
                        </div>
                        <span>{format(msg.timestamp, 'MMM dd, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 opacity-20" />
                      <p>No messages found matching your criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      {/* Footer Stat */}
      <footer className="border-t px-6 py-2 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground">
        <div>Super Admin Session: Active</div>
        <div>Total Cached Messages: {messages.length}</div>
      </footer>
    </div>
  );
};

export default AdminControl;
