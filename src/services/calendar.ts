import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  where,
  Timestamp,
  collectionGroup
} from 'firebase/firestore';
import { db } from './firebase';
import { CalendarEvent } from '@/types';

export const createEvent = async (
  orgId: string, 
  groupId: string | undefined, 
  eventData: Omit<CalendarEvent, 'id' | 'createdAt'>
) => {
  const collectionPath = groupId 
    ? `organizations/${orgId}/groups/${groupId}/events` 
    : `organizations/${orgId}/events`;
    
  return await addDoc(collection(db, collectionPath), {
    ...eventData,
    startDate: Timestamp.fromDate(new Date(eventData.startDate)),
    endDate: Timestamp.fromDate(new Date(eventData.endDate)),
    createdAt: serverTimestamp(),
    type: groupId ? 'group' : (orgId ? 'org' : 'personal')
  });
};

export const createGlobalEvent = async (
  userId: string,
  eventData: Omit<CalendarEvent, 'id' | 'createdAt'>
) => {
  return await addDoc(collection(db, `users/${userId}/events`), {
    ...eventData,
    startDate: Timestamp.fromDate(new Date(eventData.startDate)),
    endDate: Timestamp.fromDate(new Date(eventData.endDate)),
    createdAt: serverTimestamp(),
    type: 'personal',
    creatorId: userId,
    participantIds: eventData.participantIds || []
  });
};

export const updateEvent = async (
  orgId: string | undefined, 
  groupId: string | undefined, 
  eventId: string, 
  eventData: Partial<CalendarEvent>,
  userId?: string
) => {
  let docPath;
  if (orgId) {
    docPath = groupId 
      ? `organizations/${orgId}/groups/${groupId}/events/${eventId}` 
      : `organizations/${orgId}/events/${eventId}`;
  } else if (userId) {
    docPath = `users/${userId}/events/${eventId}`;
  } else {
    throw new Error("Missing context for updateEvent");
  }
    
  const updates: any = { ...eventData };
  if (eventData.startDate) updates.startDate = Timestamp.fromDate(new Date(eventData.startDate));
  if (eventData.endDate) updates.endDate = Timestamp.fromDate(new Date(eventData.endDate));
  
  // Remove undefined fields to prevent Firebase errors
  Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
  
  return await updateDoc(doc(db, docPath), updates);
};

export const deleteEvent = async (
  orgId: string | undefined, 
  groupId: string | undefined, 
  eventId: string,
  userId?: string
) => {
  let docPath;
  if (orgId) {
    docPath = groupId 
      ? `organizations/${orgId}/groups/${groupId}/events/${eventId}` 
      : `organizations/${orgId}/events/${eventId}`;
  } else if (userId) {
    docPath = `users/${userId}/events/${eventId}`;
  } else {
    throw new Error("Missing context for deleteEvent");
  }
    
  return await deleteDoc(doc(db, docPath));
};

export const subscribeToOrgEvents = (
  orgId: string, 
  callback: (events: CalendarEvent[]) => void
) => {
  const q = query(
    collection(db, `organizations/${orgId}/events`), 
    orderBy('startDate', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: (doc.data().startDate as Timestamp).toDate(),
      endDate: (doc.data().endDate as Timestamp).toDate(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
    } as CalendarEvent));
    callback(events);
  });
};

export const subscribeToGroupEvents = (
  orgId: string, 
  groupId: string, 
  callback: (events: CalendarEvent[]) => void
) => {
  const q = query(
    collection(db, `organizations/${orgId}/groups/${groupId}/events`), 
    orderBy('startDate', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: (doc.data().startDate as Timestamp).toDate(),
      endDate: (doc.data().endDate as Timestamp).toDate(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
    } as CalendarEvent));
    callback(events);
  });
};

export const subscribeToGlobalEvents = (
  userId: string,
  callback: (events: CalendarEvent[]) => void
) => {
  // Query all events where the user is a participant
  const qParticipants = query(
    collectionGroup(db, 'events'),
    where('participantIds', 'array-contains', userId)
  );

  // Query all events created by the user (useful for admins)
  const qCreated = query(
    collectionGroup(db, 'events'),
    where('createdBy', '==', userId)
  );

  // Also query user's personal events
  const qPersonal = query(
    collection(db, `users/${userId}/events`),
    orderBy('startDate', 'asc')
  );

  let participantEvents: CalendarEvent[] = [];
  let createdEvents: CalendarEvent[] = [];
  let personalEvents: CalendarEvent[] = [];

  const update = () => {
    // Combine and remove duplicates by ID
    const combined = [...participantEvents, ...createdEvents, ...personalEvents];
    const unique = Array.from(new Map(combined.map(e => [e.id, e])).values());
    callback(unique.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()));
  };

  const unsubParticipants = onSnapshot(qParticipants, (snapshot) => {
    participantEvents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: (doc.data().startDate as Timestamp).toDate(),
      endDate: (doc.data().endDate as Timestamp).toDate(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
    } as CalendarEvent));
    update();
  });

  const unsubCreated = onSnapshot(qCreated, (snapshot) => {
    createdEvents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: (doc.data().startDate as Timestamp).toDate(),
      endDate: (doc.data().endDate as Timestamp).toDate(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
    } as CalendarEvent));
    update();
  });

  const unsubPersonal = onSnapshot(qPersonal, (snapshot) => {
    personalEvents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: (doc.data().startDate as Timestamp).toDate(),
      endDate: (doc.data().endDate as Timestamp).toDate(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
    } as CalendarEvent));
    update();
  });

  return () => {
    unsubParticipants();
    unsubCreated();
    unsubPersonal();
  };
};
