
/**
 * Utility functions for formatting dates in the chat interface.
 */

/**
 * Checks if two dates represent the same day.
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Formats a date for chat separators (Today, Yesterday, or Date).
 */
export const formatChatDate = (date: Date): string => {
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) {
    return "Today";
  } else if (isSameDay(date, yesterday)) {
    return "Yesterday";
  } else {
    // Format: Month Day, Year (e.g., May 6, 2026)
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
};
