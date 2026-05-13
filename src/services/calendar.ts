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
  Timestamp
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
    type: groupId ? 'group' : 'org'
  });
};

export const updateEvent = async (
  orgId: string, 
  groupId: string | undefined, 
  eventId: string, 
  eventData: Partial<CalendarEvent>
) => {
  const docPath = groupId 
    ? `organizations/${orgId}/groups/${groupId}/events/${eventId}` 
    : `organizations/${orgId}/events/${eventId}`;
    
  const updates: any = { ...eventData };
  if (eventData.startDate) updates.startDate = Timestamp.fromDate(new Date(eventData.startDate));
  if (eventData.endDate) updates.endDate = Timestamp.fromDate(new Date(eventData.endDate));
  
  // Remove undefined fields to prevent Firebase errors
  Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
  
  return await updateDoc(doc(db, docPath), updates);
};

export const deleteEvent = async (
  orgId: string, 
  groupId: string | undefined, 
  eventId: string
) => {
  const docPath = groupId 
    ? `organizations/${orgId}/groups/${groupId}/events/${eventId}` 
    : `organizations/${orgId}/events/${eventId}`;
    
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
