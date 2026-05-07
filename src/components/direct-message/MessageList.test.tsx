import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MessageList } from './MessageList';
import { Check, CheckCheck } from 'lucide-react';

describe('MessageList', () => {
  const messages = [
    {
      id: '1',
      groupId: '1',
      text: 'Hello',
      senderId: '1',
      senderName: 'John Doe',
      timestamp: new Date(),
      type: 'text',
      readBy: [],
      isRead: false,
    },
    {
      id: '2',
      groupId: '1',
      text: 'Hi',
      senderId: '2',
      senderName: 'Jane Doe',
      timestamp: new Date(),
      type: 'text' as const,
      readBy: [],
      isRead: false,
    },
  ] as any[];

  const user = { uid: '1' };
  const otherUser = { userId: '2', name: 'Jane Doe' };

  it('renders a list of messages', () => {
    render(
      <MessageList
        messages={messages}
        user={user}
        otherUser={otherUser}
        isLoading={false}
        messagesEndRef={{ current: null }}
        messageRefs={{ current: {} }}
        handleEditMessage={() => {}}
        handleDeleteMessage={() => {}}
        handleReplyToMessage={() => {}}
        handleReaction={() => {}}
        handleReplyClick={() => {}}
        handleTogglePin={() => {}}
      />
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi')).toBeInTheDocument();
  });

  it('shows a loading message when loading', () => {
    render(
      <MessageList
        messages={[]}
        user={user}
        otherUser={otherUser}
        isLoading={true}
        messagesEndRef={{ current: null }}
        messageRefs={{ current: {} }}
        handleEditMessage={() => {}}
        handleDeleteMessage={() => {}}
        handleReplyToMessage={() => {}}
        handleReaction={() => {}}
        handleReplyClick={() => {}}
        handleTogglePin={() => {}}
      />
    );
    expect(screen.getByText('Loading messages...')).toBeInTheDocument();
  });

  it('shows a message when there are no messages', () => {
    render(
      <MessageList
        messages={[]}
        user={user}
        otherUser={otherUser}
        isLoading={false}
        messagesEndRef={{ current: null }}
        messageRefs={{ current: {} }}
        handleEditMessage={() => {}}
        handleDeleteMessage={() => {}}
        handleReplyToMessage={() => {}}
        handleReaction={() => {}}
        handleReplyClick={() => {}}
        handleTogglePin={() => {}}
      />
    );
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });
});
