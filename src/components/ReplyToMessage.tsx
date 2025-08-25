import React from 'react';

interface ReplyToMessageProps {
  senderName: string;
  text: string;
  onClick?: () => void;
  isOwnMessage: boolean;
}

export const ReplyToMessage: React.FC<ReplyToMessageProps> = ({ senderName, text, onClick, isOwnMessage }) => {
  return (
    <div
      className={`text-xs mb-1 px-2 py-1 border-l-2 rounded-sm max-w-[250px] ${
        isOwnMessage
          ? 'bg-gray-100 '
          : 'bg-gray-100 border-green-500'
      }`}
      onClick={onClick}
    >
      <div
        className={`font-medium text-xs ${
          isOwnMessage ? 'text-slate-600' : 'text-slate-600'
        }`}
      >
        {senderName}
      </div>
      <div
        className={`text-xs mt-0.5 ${
          isOwnMessage ? 'text-gray-600' : 'text-gray-600'
        }`}
      >
        {text.length > 50 ? `${text.substring(0, 50)}...` : text}
      </div>
    </div>
  );
};