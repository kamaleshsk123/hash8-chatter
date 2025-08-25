import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MessageInput } from './MessageInput';

describe('MessageInput', () => {
  const otherUser = { name: 'Jane Doe' };

  it('renders the message input', () => {
    render(
      <MessageInput
        newMessage=""
        isSending={false}
        editingMessageId={null}
        otherUser={otherUser}
        replyToMessage={null}
        fileInputRef={{ current: null }}
        handleInputChange={() => {}}
        handleKeyPress={() => {}}
        handleSendMessage={() => {}}
        handleFileUpload={() => {}}
        handleVoiceMessage={() => {}}
        handleEmojiSelect={() => {}}
        cancelReply={() => {}}
        cancelEditing={() => {}}
      />
    );
    expect(screen.getByPlaceholderText('Message Jane Doe...')).toBeInTheDocument();
  });

  it('calls the handleSendMessage function when the send button is clicked', () => {
    const handleSendMessage = vi.fn();
    render(
      <MessageInput
        newMessage="Hello"
        isSending={false}
        editingMessageId={null}
        otherUser={otherUser}
        replyToMessage={null}
        fileInputRef={{ current: null }}
        handleInputChange={() => {}}
        handleKeyPress={() => {}}
        handleSendMessage={handleSendMessage}
        handleFileUpload={() => {}}
        handleVoiceMessage={() => {}}
        handleEmojiSelect={() => {}}
        cancelReply={() => {}}
        cancelEditing={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(handleSendMessage).toHaveBeenCalled();
  });
});
