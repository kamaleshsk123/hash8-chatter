import { formatDistanceToNow, format } from 'date-fns';

export const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);

  if (diffInDays < 1) {
    return formatDistanceToNow(date, { addSuffix: true });
  } else if (diffInDays < 7) {
    return format(date, 'eeee'); // e.g., "Monday"
  } else {
    return format(date, 'MMM d'); // e.g., "Aug 15"
  }
};
