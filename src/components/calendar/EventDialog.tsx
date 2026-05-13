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
import { createEvent, updateEvent, deleteEvent } from '@/services/calendar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { EVENT_LABELS, DEFAULT_LABEL_ID } from './constants';
import { cn } from '@/lib/utils';

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  groupId?: string;
  userId: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description);
      setStartDate(format(eventToEdit.startDate, "yyyy-MM-dd'T'HH:mm"));
      setEndDate(format(eventToEdit.endDate, "yyyy-MM-dd'T'HH:mm"));
      setLocation(eventToEdit.location || '');
      setLabelId(eventToEdit.labelId || DEFAULT_LABEL_ID);
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
        createdBy: userId,
      };

      if (groupId) {
        eventData.groupId = groupId;
        eventData.type = 'group';
      } else {
        eventData.type = 'org';
      }

      if (eventToEdit) {
        await updateEvent(orgId, groupId, eventToEdit.id, eventData);
        toast({ title: "Event updated", description: "Your event has been successfully updated." });
      } else {
        await createEvent(orgId, groupId, eventData);
        toast({ title: "Event created", description: "Your event has been successfully created." });
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
      await deleteEvent(orgId, groupId, eventToEdit.id);
      toast({ title: "Event deleted", description: "The event has been successfully removed." });
      setShowDeleteConfirm(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{eventToEdit ? 'Edit Event' : 'Create New Event'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Event Title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What's this event about?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date & Time *</Label>
              <Input 
                id="startDate" 
                type="datetime-local" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date & Time *</Label>
              <Input 
                id="endDate" 
                type="datetime-local" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input 
              id="location" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              placeholder="Physical or Virtual location"
            />
          </div>
          <div className="space-y-3">
            <Label>Event Label</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_LABELS.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => setLabelId(label.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    labelId === label.id 
                      ? `${label.bg} ${label.text} ${label.border} shadow-sm ring-2 ring-primary/20`
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full", labelId === label.id ? "bg-white" : label.indicator)} />
                  {label.name}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-row justify-between items-center gap-2">
            <div>
              {eventToEdit && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting ? 'Saving...' : (eventToEdit ? 'Update Event' : 'Create Event')}
              </Button>
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
