import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarEvent } from '@/types';
import { createEvent, updateEvent, deleteEvent, createGlobalEvent } from '@/services/calendar';
import { getOrganizationMembers, getUsersByIds, searchUsers } from '@/services/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Trash2, Search, Check, Users, X } from 'lucide-react';
import { EVENT_LABELS, DEFAULT_LABEL_ID } from './constants';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId?: string;
  groupId?: string;
  userId: string;
  userRole?: string;
  eventToEdit?: CalendarEvent;
  selectedDate?: Date;
  onSuccess?: () => void;
}

export const EventDialog: React.FC<EventDialogProps> = ({
  open,
  onOpenChange,
  orgId,
  groupId,
  userId,
  userRole,
  eventToEdit,
  selectedDate,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [labelId, setLabelId] = useState(DEFAULT_LABEL_ID);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInitialMembers = async () => {
      if (!open) return;
      
      setMembersLoading(true);
      try {
        let initialMembers: any[] = [];
        
        if (orgId) {
          const orgMembers = await getOrganizationMembers(orgId);
          const userIds = orgMembers.map((m: any) => m.userId);
          const profiles = await getUsersByIds(userIds);
          
          initialMembers = profiles.map(profile => {
            const orgMember = orgMembers.find((m: any) => m.userId === profile.userId);
            return { ...profile, role: orgMember?.role || 'member' };
          });
        }

        // If we're editing an event, make sure all current participants are in the members list
        if (eventToEdit?.participantIds?.length) {
          const missingParticipantIds = eventToEdit.participantIds.filter(
            pid => !initialMembers.some(m => m.userId === pid)
          );
          
          if (missingParticipantIds.length > 0) {
            const additionalProfiles = await getUsersByIds(missingParticipantIds);
            initialMembers = [...initialMembers, ...additionalProfiles];
          }
        }

        setMembers(initialMembers);
      } catch (error) {
        console.error("Error fetching members:", error);
      } finally {
        setMembersLoading(false);
      }
    };
    fetchInitialMembers();
  }, [orgId, open, eventToEdit?.id]);

  // Handle member search
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        // If query is cleared, go back to initial members if in org mode
        if (orgId && open) {
          const orgMembers = await getOrganizationMembers(orgId);
          const userIds = orgMembers.map((m: any) => m.userId);
          const profiles = await getUsersByIds(userIds);
          const membersWithRoles = profiles.map(profile => {
            const orgMember = orgMembers.find((m: any) => m.userId === profile.userId);
            return { ...profile, role: orgMember?.role || 'member' };
          });
          setMembers(membersWithRoles);
        } else if (!orgId) {
          // In global mode, if search is cleared, we should keep the participants
          // The fetchInitialMembers effect already handles loading them.
          // We don't want to clear them here.
        }
        return;
      }

      setMembersLoading(true);
      try {
        if (orgId) {
          // Filter existing members or search if needed
          // For now, simple filtering of loaded members
        } else {
          const results = await searchUsers(searchQuery);
          setMembers(results);
        }
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setMembersLoading(false);
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, orgId, open]);

  // Ensure all participant profiles are loaded
  useEffect(() => {
    const fetchMissingProfiles = async () => {
      if (!participantIds.length) return;
      
      const missingIds = participantIds.filter(
        id => !members.some(m => m.userId === id)
      );
      
      if (missingIds.length > 0) {
        try {
          const profiles = await getUsersByIds(missingIds);
          if (profiles.length > 0) {
            setMembers(prev => {
              // Only add those still missing to avoid duplicates
              const stillMissing = profiles.filter(
                p => !prev.some(m => m.userId === p.userId)
              );
              return [...prev, ...stillMissing];
            });
          }
        } catch (error) {
          console.error("Error fetching missing participant profiles:", error);
        }
      }
    };
    
    fetchMissingProfiles();
  }, [participantIds, open]);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description);
      setStartDate(format(eventToEdit.startDate, "yyyy-MM-dd'T'HH:mm"));
      setEndDate(format(eventToEdit.endDate, "yyyy-MM-dd'T'HH:mm"));
      setLocation(eventToEdit.location || '');
      setLabelId(eventToEdit.labelId || DEFAULT_LABEL_ID);
      setParticipantIds(eventToEdit.participantIds || []);
    } else if (selectedDate) {
      const start = new Date(selectedDate);
      start.setHours(9, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(10, 0, 0, 0);
      setStartDate(format(start, "yyyy-MM-dd'T'HH:mm"));
      setEndDate(format(end, "yyyy-MM-dd'T'HH:mm"));
      setTitle('');
      setDescription('');
      setLocation('');
      setLabelId(DEFAULT_LABEL_ID);
      setParticipantIds([]);
    }
  }, [eventToEdit, selectedDate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const eventData: any = {
        orgId,
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        labelId,
        participantIds,
        createdBy: userId,
      };

      if (groupId) {
        eventData.groupId = groupId;
        eventData.type = 'group';
      } else {
        eventData.type = 'org';
      }

      if (orgId) {
        if (eventToEdit) {
          await updateEvent(orgId, groupId, eventToEdit.id, eventData);
          toast({ title: "Event updated", description: "Your event has been successfully updated." });
        } else {
          await createEvent(orgId, groupId, eventData);
          toast({ title: "Event created", description: "Your event has been successfully created." });
        }
      } else {
        if (eventToEdit) {
          // Detect if it's a personal event or an org event we're editing in global view
          const targetOrgId = eventToEdit.orgId;
          const targetGroupId = eventToEdit.groupId;
          await updateEvent(targetOrgId, targetGroupId, eventToEdit.id, eventData, userId);
          toast({ title: "Event updated", description: "Your event has been successfully updated." });
        } else {
          await createGlobalEvent(userId, eventData);
          toast({ title: "Event created", description: "Your event has been successfully created." });
        }
      }
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving event:", error);
      toast({
        title: "Error",
        description: "Failed to save the event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!eventToEdit) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!eventToEdit) return;
    
    setIsDeleting(true);
    try {
      const targetOrgId = eventToEdit?.orgId || orgId;
      const targetGroupId = eventToEdit?.groupId || groupId;
      await deleteEvent(targetOrgId, targetGroupId, eventToEdit!.id, userId);
      toast({ title: "Event deleted", description: "The event has been successfully removed." });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: "Failed to delete the event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const canManage = userRole === 'admin' || userRole === 'moderator';

  const filteredMembers = members.filter(m => 
    m.userId !== userId && // Exclude the current user (organizer)
    ((m.displayName || m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleParticipant = (id: string) => {
    if (!canManage) return;
    setParticipantIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
        <DialogHeader className="px-8 pt-8 pb-4 bg-muted/20 border-b border-border/10">
          <DialogTitle className="text-2xl font-black tracking-tight">
            {eventToEdit ? (canManage ? 'Edit Event' : 'Event Details') : 'Create New Event'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Left Column: Event Details */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary/50">General Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs font-bold text-muted-foreground ml-1">Title *</Label>
                    <Input 
                      id="title" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      placeholder="Event Title"
                      className="rounded-2xl bg-muted/30 border-none h-12 focus-visible:ring-primary/20 text-base font-semibold"
                      required
                      readOnly={!canManage}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-xs font-bold text-muted-foreground ml-1">Description</Label>
                    <Textarea 
                      id="description" 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      placeholder="What's this event about?"
                      className="rounded-2xl bg-muted/30 border-none min-h-[100px] focus-visible:ring-primary/20 resize-none py-3"
                      readOnly={!canManage}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary/50">Schedule & Location</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate" className="text-xs font-bold text-muted-foreground ml-1">Start *</Label>
                      <Input 
                        id="startDate" 
                        type="datetime-local" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="rounded-2xl bg-muted/30 border-none h-11 focus-visible:ring-primary/20 text-sm font-medium"
                        required
                        readOnly={!canManage}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate" className="text-xs font-bold text-muted-foreground ml-1">End *</Label>
                      <Input 
                        id="endDate" 
                        type="datetime-local" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        className="rounded-2xl bg-muted/30 border-none h-11 focus-visible:ring-primary/20 text-sm font-medium"
                        required
                        readOnly={!canManage}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-xs font-bold text-muted-foreground ml-1">Location</Label>
                    <Input 
                      id="location" 
                      value={location} 
                      onChange={(e) => setLocation(e.target.value)} 
                      placeholder="Physical or Virtual location"
                      className="rounded-2xl bg-muted/30 border-none h-11 focus-visible:ring-primary/20"
                      readOnly={!canManage}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary/50">Categorization</h3>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_LABELS.map((label) => (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => canManage && setLabelId(label.id)}
                        disabled={!canManage}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border transition-all duration-300",
                          labelId === label.id 
                            ? `${label.bg} ${label.text} ${label.border} shadow-lg shadow-primary/10 ring-2 ring-primary/20`
                            : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50",
                          !canManage && "cursor-default"
                        )}
                      >
                        <div className={cn("w-2 h-2 rounded-full", labelId === label.id ? "bg-current" : label.indicator)} />
                        {label.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Participants */}
              <div className="flex flex-col space-y-6">
                <div className="space-y-4 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary/50">Participants</h3>
                    <Badge variant="outline" className="rounded-full bg-primary/5 text-primary border-primary/10 font-black">
                      {participantIds.length} Selected
                    </Badge>
                  </div>
                  
                  {/* Selected Participants Chips */}
                  <div className="min-h-[60px] max-h-[120px] overflow-y-auto flex flex-wrap gap-2 p-3 bg-primary/[0.03] rounded-3xl border border-primary/5">
                    {participantIds.length > 0 ? (
                      <>
                        {participantIds.slice(0, 3).map(id => {
                          const member = members.find(m => m.userId === id);
                          if (!member) return null;
                          return (
                            <Badge key={id} variant="secondary" className="pl-1 pr-2 py-1 gap-2 bg-background border-border/40 hover:bg-background rounded-full shadow-sm">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback className="text-[10px] font-bold">{member.displayName?.charAt(0) || member.email?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-[11px] font-bold text-foreground">{member.displayName || member.email}</span>
                              {canManage && (
                                <button 
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); toggleParticipant(id); }}
                                  className="p-1 hover:bg-muted rounded-full transition-colors group"
                                >
                                  <X className="w-3 h-3 text-muted-foreground group-hover:text-destructive" />
                                </button>
                              )}
                            </Badge>
                          );
                        })}
                        {participantIds.length > 3 && (
                          <Badge variant="secondary" className="px-3 py-1 rounded-full bg-primary/5 border-primary/10 text-[10px] font-black text-primary">
                            +{participantIds.length - 3} more
                          </Badge>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full opacity-30 italic text-xs">
                        No participants added
                      </div>
                    )}
                  </div>

                  {/* Search and Member List */}
                  <div className="flex-1 flex flex-col space-y-3 min-h-0">
                    {canManage && (
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search members to invite..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-11 h-12 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary/20 text-sm"
                          type="text"
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        />
                      </div>
                    )}

                    <ScrollArea className={cn("flex-1 border border-border/10 rounded-3xl bg-muted/10 overflow-hidden", !canManage && "h-[300px]")}>
                      <div className="p-3 space-y-1.5">
                        {membersLoading ? (
                          <div className="flex flex-col items-center justify-center py-10 space-y-3">
                            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Finding Team...</p>
                          </div>
                        ) : filteredMembers.length === 0 && canManage ? (
                          <div className="py-10 text-center flex flex-col items-center">
                            <Users className="w-8 h-8 text-muted-foreground/20 mb-2" />
                            <p className="text-[11px] text-muted-foreground font-medium italic">No members found</p>
                          </div>
                        ) : (
                          // Only show selected members for non-admins, or all for admins
                          (canManage ? filteredMembers : members.filter(m => participantIds.includes(m.userId))).map(member => (
                            <button
                              key={member.userId}
                              type="button"
                              onClick={() => canManage && toggleParticipant(member.userId)}
                              disabled={!canManage}
                              className={cn(
                                "w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 text-left group",
                                participantIds.includes(member.userId) 
                                  ? "bg-primary/10 ring-1 ring-primary/30 shadow-inner" 
                                  : "hover:bg-background hover:shadow-md hover:scale-[1.02]",
                                !canManage && "cursor-default hover:scale-100 shadow-none"
                              )}
                            >
                              <div className="relative">
                                <Avatar className="w-10 h-10 ring-2 ring-background shadow-sm">
                                  <AvatarImage src={member.avatar} />
                                  <AvatarFallback className="bg-muted text-foreground text-sm font-bold">
                                    {member.displayName?.charAt(0) || member.email?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {participantIds.includes(member.userId) && (
                                  <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 border-2 border-background shadow-xl scale-110">
                                    <Check className="w-2.5 h-2.5 font-bold" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-black text-foreground truncate group-hover:text-primary transition-colors">
                                    {member.displayName || member.email}
                                  </p>
                                  {member.role && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md bg-muted/50 border-border/40 text-muted-foreground uppercase font-bold tracking-tighter">
                                      {member.role}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] font-medium text-muted-foreground truncate uppercase tracking-tight">
                                  {member.email}
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-8 py-6 bg-muted/20 border-t border-border/10 flex-row justify-between items-center gap-4">
            <div>
              {eventToEdit && canManage && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 font-bold px-6 h-12"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete Event'}
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl font-bold px-6 h-12">
                {canManage ? 'Cancel' : 'Close'}
              </Button>
              {canManage && (
                <Button type="submit" disabled={isSubmitting || isDeleting} className="rounded-2xl font-black px-10 h-12 shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                  {isSubmitting ? 'Saving...' : (eventToEdit ? 'Update Event' : 'Create Event')}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-3xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold tracking-tight">Delete Event</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              Are you sure you want to delete "{title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-border/40 font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {isDeleting ? 'Deleting...' : 'Delete Event'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
