// Shared utility functions for Dog Duty

export const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const MEMBER_COLORS = [
  { bg: '#F3F0EA', text: '#8A7B6B' }, // Oat
  { bg: '#EDEAEF', text: '#736880' }, // Blueberry
  { bg: '#E8EDE8', text: '#5E7A65' }, // Herb
  { bg: '#F0EAEA', text: '#7B5E5E' }, // Lingonberry
  { bg: '#E8EAED', text: '#5E6875' }, // Stone
  { bg: '#EDEBE5', text: '#756E5E' }, // Rye
] as const;

export const getMemberColor = (name: string) => {
  const index = name.charCodeAt(0) % MEMBER_COLORS.length;
  return MEMBER_COLORS[index];
};

export const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
};

export const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};
