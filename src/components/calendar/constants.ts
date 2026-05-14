export interface EventLabel {
  id: string;
  name: string;
  bg: string;
  text: string;
  border: string;
  indicator: string;
}

export const EVENT_LABELS: EventLabel[] = [
  { 
    id: 'work', 
    name: 'Work', 
    bg: 'bg-blue-500/90', 
    text: 'text-white', 
    border: 'border-blue-600',
    indicator: 'bg-blue-500'
  },
  { 
    id: 'personal', 
    name: 'Personal', 
    bg: 'bg-emerald-500/90', 
    text: 'text-white', 
    border: 'border-emerald-600',
    indicator: 'bg-emerald-500'
  },
  { 
    id: 'urgent', 
    name: 'Urgent', 
    bg: 'bg-red-500/90', 
    text: 'text-white', 
    border: 'border-red-600',
    indicator: 'bg-red-500'
  },
  { 
    id: 'meeting', 
    name: 'Meeting', 
    bg: 'bg-purple-500/90', 
    text: 'text-white', 
    border: 'border-purple-600',
    indicator: 'bg-purple-500'
  },
  { 
    id: 'holiday', 
    name: 'Holiday', 
    bg: 'bg-amber-500/90', 
    text: 'text-white', 
    border: 'border-amber-600',
    indicator: 'bg-amber-500'
  },
  { 
    id: 'task', 
    name: 'Task', 
    bg: 'bg-cyan-500/90', 
    text: 'text-white', 
    border: 'border-cyan-600',
    indicator: 'bg-cyan-500'
  },
  { 
    id: 'other', 
    name: 'Other', 
    bg: 'bg-slate-500/90', 
    text: 'text-white', 
    border: 'border-slate-600',
    indicator: 'bg-slate-500'
  },
];

export const DEFAULT_LABEL_ID = 'other';

export function getLabelColor(labelId?: string) {
  const label = EVENT_LABELS.find(l => l.id === labelId) || EVENT_LABELS.find(l => l.id === DEFAULT_LABEL_ID)!;
  return label;
}
