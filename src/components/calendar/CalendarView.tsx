import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  format, addMonths, subMonths, addWeeks, subWeeks,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  isSameMonth, isSameDay, addDays, isToday, getHours, getMinutes
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Calendar as CalendarIcon, Trash2, Edit2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarEvent } from '@/types';
import { 
  subscribeToOrgEvents, 
  subscribeToGroupEvents, 
  deleteEvent,
  subscribeToGlobalEvents
} from '@/services/calendar';
import { getLabelColor } from './constants';
import { EventDialog } from './EventDialog';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";

interface CalendarViewProps {
  orgId: string;
  groupId?: string;
  userRole?: string;
}


/* ── Mini Month Calendar ──────────────────────────────── */
const MiniCalendar = React.memo(({
  currentMonth, selectedDate, onSelectDate, onMonthChange, eventsByDate,
}: {
  currentMonth: Date; selectedDate: Date;
  onSelectDate: (d: Date) => void; onMonthChange: (d: Date) => void;
  eventsByDate: Record<string, CalendarEvent[]>;
}) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const start = startOfWeek(monthStart);
  const end = endOfWeek(monthEnd);

  const days: Date[] = [];
  let d = start;
  while (d <= end) { days.push(new Date(d)); d = addDays(d, 1); }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-foreground">{format(currentMonth, "MMMM yyyy")}</span>
        <div className="flex gap-0.5">
          <button onClick={() => onMonthChange(subMonths(currentMonth, 1))} className="p-1 rounded hover:bg-muted transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => onMonthChange(addMonths(currentMonth, 1))} className="p-1 rounded hover:bg-muted transition-colors">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-muted-foreground/50 pb-1">{d}</div>
        ))}
        {days.map((day, i) => {
          const key = format(day, "yyyy-MM-dd");
          const hasEvents = !!eventsByDate[key]?.length;
          const isSelected = isSameDay(day, selectedDate);
          const isCur = isSameMonth(day, monthStart);
          const isT = isToday(day);
          return (
            <button key={i} onClick={() => onSelectDate(day)}
              className={cn(
                "relative w-7 h-7 text-[11px] font-medium rounded-full flex items-center justify-center transition-all mx-auto",
                !isCur && "text-muted-foreground/25",
                isCur && !isSelected && !isT && "text-foreground hover:bg-muted",
                isT && !isSelected && "bg-primary/15 text-primary font-bold",
                isSelected && "bg-primary text-primary-foreground font-bold shadow-sm",
              )}>
              {format(day, "d")}
              {hasEvents && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
MiniCalendar.displayName = 'MiniCalendar';

/* ── Time helper ──────────────────────────────────────── */
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

function getTimePosition(date: Date) {
  const h = getHours(date);
  const m = getMinutes(date);
  return ((h - 6) * 60 + m); // minutes from 6 AM
}

/* ── Main Calendar View ──────────────────────────────── */
export const CalendarView: React.FC<CalendarViewProps> = ({ orgId, groupId, userRole }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date()));
  const [miniMonth, setMiniMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | undefined>(undefined);
  const { user } = useAuth();
  const { toast } = useToast();

  const canManageEvents = useMemo(() => 
    !orgId || userRole === 'admin' || userRole === 'moderator', 
    [orgId, userRole]
  );

  useEffect(() => {
    if (!orgId) {
      if (user?.uid) {
        return subscribeToGlobalEvents(user.uid, setEvents);
      }
      return;
    }
    const unsubscribe = groupId
      ? subscribeToGroupEvents(orgId, groupId, setEvents)
      : subscribeToOrgEvents(orgId, setEvents);
    return () => unsubscribe?.();
  }, [orgId, groupId, user?.uid]);

  const visibleEvents = useMemo(() => {
    if (canManageEvents) return events;
    return events.filter(event => 
      event.participantIds?.includes(user?.uid || '')
    );
  }, [events, canManageEvents, user]);

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    visibleEvents.forEach(event => {
      const key = format(event.startDate, "yyyy-MM-dd");
      (grouped[key] ??= []).push(event);
    });
    return grouped;
  }, [visibleEvents]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const nextWeek = useCallback(() => setCurrentWeekStart(w => addWeeks(w, 1)), []);
  const prevWeek = useCallback(() => setCurrentWeekStart(w => subWeeks(w, 1)), []);
  const goToToday = useCallback(() => {
    setCurrentWeekStart(startOfWeek(new Date()));
    setSelectedDate(new Date());
    setMiniMonth(new Date());
  }, []);

  const handleSelectMiniDate = useCallback((d: Date) => {
    setSelectedDate(d);
    setCurrentWeekStart(startOfWeek(d));
  }, []);

  const handleDeleteEvent = useCallback((eventId: string) => {
    setEventToDeleteId(eventId);
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDelete = async () => {
    if (!eventToDeleteId) return;
    try {
      await deleteEvent(orgId, groupId, eventToDeleteId);
      toast({ title: "Event deleted", description: "The event has been removed." });
      setIsDeleteDialogOpen(false);
      setEventToDeleteId(null);
    } catch {
      toast({ title: "Error", description: "Failed to delete event.", variant: "destructive" });
    }
  };

  const handleEditEvent = useCallback((eventId: string) => {
    const ev = events.find(e => e.id === eventId);
    if (ev) { setEventToEdit(ev); setIsEventDialogOpen(true); }
  }, [events]);

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDateEvents = eventsByDate[selectedDateKey] || [];



  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-background">
      {/* ── Top Bar ──────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          {canManageEvents && (
            <Button
              onClick={() => { setEventToEdit(undefined); setIsEventDialogOpen(true); }}
              className="gap-2 bg-background border border-border/60 text-foreground font-semibold rounded-2xl shadow-sm hover:shadow-md hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all px-5 group"
              variant="outline"
            >
              <Plus className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
              Create
            </Button>
          )}
          <div className="flex items-center gap-1 ml-2">
            <Button variant="ghost" size="icon" onClick={prevWeek} className="h-8 w-8 rounded-full hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextWeek} className="h-8 w-8 rounded-full hover:bg-muted">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-bold text-foreground ml-2">
            {!orgId && <span className="text-primary mr-2">Global</span>}
            {format(currentWeekStart, "MMMM yyyy")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}
            className="rounded-xl text-xs font-bold border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all px-4">
            Today
          </Button>
          <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted/30 rounded-lg border border-border/30">
            Week
          </span>
        </div>
      </div>

      {/* ── Body: Sidebar + Weekly Grid ──────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r border-border/30 p-4 gap-6 overflow-y-auto">
          <MiniCalendar
            currentMonth={miniMonth}
            selectedDate={selectedDate}
            onSelectDate={handleSelectMiniDate}
            onMonthChange={setMiniMonth}
            eventsByDate={eventsByDate}
          />
          {/* Upcoming events */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">Upcoming</h4>
            <div className="space-y-2">
              {visibleEvents
                .filter(e => e.startDate >= new Date())
                .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
                .slice(0, 5)
                .map(ev => {
                  const c = getLabelColor(ev.labelId);
                  return (
                    <button key={ev.id} onClick={() => handleEditEvent(ev.id)}
                      className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                      <div className="flex items-start gap-2">
                        <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", c.bg)} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{ev.title}</p>
                          <p className="text-[10px] text-muted-foreground">{format(ev.startDate, "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              }
              {visibleEvents.filter(e => e.startDate >= new Date()).length === 0 && (
                <p className="text-[11px] text-muted-foreground/40 italic">No upcoming events</p>
              )}
            </div>
          </div>
        </div>

        {/* Weekly time grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Day headers */}
          <div className="flex border-b border-border/30 flex-shrink-0">
            <div className="w-16 flex-shrink-0" /> {/* gutter */}
            {weekDays.map((day, i) => {
              const isT = isToday(day);
              const isSel = isSameDay(day, selectedDate);
              return (
                <div key={i} className="flex-1 text-center py-2 border-l border-border/20 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => { setSelectedDate(day); setIsSidebarOpen(true); }}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    {format(day, "EEE")}
                  </div>
                  <div className={cn(
                    "text-xl font-bold mt-0.5 w-10 h-10 rounded-full flex items-center justify-center mx-auto transition-colors",
                    isT && "bg-primary text-primary-foreground",
                    isSel && !isT && "bg-primary/15 text-primary",
                    !isT && !isSel && "text-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrollable time slots */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="relative flex" style={{ minHeight: `${HOURS.length * 60}px` }}>
              {/* Time labels */}
              <div className="w-16 flex-shrink-0 relative">
                {HOURS.map(hour => (
                  <div key={hour} className="absolute w-full pr-2 text-right" style={{ top: `${(hour - 6) * 60}px`, height: '60px' }}>
                    <span className="text-[10px] font-medium text-muted-foreground/40 -translate-y-1/2 inline-block">
                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, dayIdx) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate[key] || [];
                return (
                  <div key={dayIdx} className="flex-1 relative border-l border-border/20"
                    onClick={() => { 
                      setSelectedDate(day); 
                      if (canManageEvents) {
                        setEventToEdit(undefined); 
                        setIsEventDialogOpen(true); 
                      } else {
                        setIsSidebarOpen(true); // Members can still view the daily agenda
                      }
                    }}>
                    {/* Hour grid lines */}
                    {HOURS.map(hour => (
                      <div key={hour} className="absolute w-full border-t border-border/15"
                        style={{ top: `${(hour - 6) * 60}px`, height: '60px' }} />
                    ))}
                    {/* Today highlight */}
                    {isToday(day) && <div className="absolute inset-0 bg-primary/[0.02]" />}
                    {/* Event blocks */}
                    {dayEvents.map(ev => {
                      const top = Math.max(0, getTimePosition(ev.startDate));
                      const bottom = getTimePosition(ev.endDate);
                      const height = Math.max(24, bottom - top);
                      const c = getLabelColor(ev.labelId);
                      return (
                        <div key={ev.id}
                          className={cn(
                            "absolute left-0.5 right-1 rounded-lg px-2 py-1 cursor-pointer overflow-hidden border-l-[3px] shadow-sm hover:shadow-md transition-shadow z-10",
                            c.bg, c.text, c.border
                          )}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          onClick={(e) => { e.stopPropagation(); handleEditEvent(ev.id); }}
                        >
                          <p className="text-[11px] font-bold truncate leading-tight">{ev.title}</p>
                          {height > 30 && (
                            <p className="text-[9px] opacity-80 truncate">
                              {format(ev.startDate, "h:mm a")} – {format(ev.endDate, "h:mm a")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Daily Agenda Sidebar ────────────────────── */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[500px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <SheetTitle className="text-xl font-black tracking-tight">
                  {format(selectedDate, "MMMM d, yyyy")}
                </SheetTitle>
                <p className="text-xs text-muted-foreground font-medium">Daily Agenda</p>
              </div>
            </div>
          </SheetHeader>
          <div className="space-y-4">
            {selectedDateEvents.length > 0 ? selectedDateEvents.map(event => {
              const c = getLabelColor(event.labelId);
              return (
                <Card key={event.id} className="group relative overflow-hidden border-border/40 bg-background hover:border-primary/25 transition-colors rounded-2xl shadow-md shadow-black/[0.03]">
                  <div className={cn("absolute top-0 left-0 w-1.5 h-full", c.indicator)} />
                <CardHeader className="pb-2 space-y-0">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 min-w-0 flex-1 text-left">
                      <CardTitle className="text-base font-bold truncate group-hover:text-primary transition-colors">{event.title}</CardTitle>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-medium">
                        <Clock className="h-3 w-3" />
                        {format(event.startDate, "h:mm a")} — {format(event.endDate, "h:mm a")}
                      </div>
                    </div>
                    {canManageEvents && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary"
                          onClick={() => { setEventToEdit(event); setIsEventDialogOpen(true); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteEvent(event.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-left">
                  <p className="text-sm text-muted-foreground leading-relaxed">{event.description || "No details provided."}</p>
                  {event.location && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/8 px-2.5 py-1.5 rounded-lg w-fit">
                      <MapPin className="h-3 w-3" />{event.location}
                    </div>
                  )}
                  {event.participantIds && event.participantIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {event.participantIds.slice(0, 5).map((id, idx) => (
                        <div key={id} className="w-5 h-5 rounded-full bg-muted border border-background overflow-hidden" title="Participant">
                           <Users className="w-3 h-3 m-1 text-muted-foreground" />
                        </div>
                      ))}
                      {event.participantIds.length > 5 && (
                        <span className="text-[10px] text-muted-foreground self-center">+{event.participantIds.length - 5}</span>
                      )}
                    </div>
                  )}
                </CardContent>
                </Card>
              );
            }) : (
              <div className="py-16 flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-3xl bg-muted/5">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <CalendarIcon className="h-7 w-7 text-muted-foreground/25" />
                </div>
                <h4 className="text-sm font-bold text-foreground mb-1">Clear Schedule</h4>
                <p className="text-muted-foreground text-xs mb-5">No events for this date.</p>
                <Button variant="ghost" className="font-bold text-[11px] rounded-xl border border-primary/20 hover:bg-primary/10 text-primary px-5"
                  onClick={() => { 
                    if (canManageEvents) {
                      setEventToEdit(undefined); 
                      setIsEventDialogOpen(true); 
                    } else {
                      toast({ title: "Access Denied", description: "Only admins and moderators can schedule events." });
                    }
                  }}>
                  Schedule an Event
                </Button>
              </div>
            )}
          </div>
          {canManageEvents && (
            <div className="mt-6 pt-5 border-t border-border/40">
              <Button className="w-full gap-2 font-bold rounded-xl shadow-lg shadow-primary/20"
                onClick={() => { setEventToEdit(undefined); setIsEventDialogOpen(true); }}>
                <Plus className="h-4 w-4" />Add New Event
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirmation ─────────────────────── */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold tracking-tight">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              This action cannot be undone. This will permanently delete the event from the calendar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-border/40 font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold">
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Event Dialog ────────────────────────────── */}
      {user && (
        <EventDialog
          open={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          orgId={orgId}
          groupId={groupId}
          userId={user.uid}
          userRole={userRole}
          eventToEdit={eventToEdit}
          selectedDate={selectedDate}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
};
