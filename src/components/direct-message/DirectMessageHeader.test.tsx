import React from 'react';
import { render, screen } from '@testing-library/react';
import { DirectMessageHeader } from './DirectMessageHeader';

// Mock the Avatar and AvatarImage components
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-avatar">{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-avatar-fallback">{children}</div>,
  AvatarImage: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} data-testid="mock-avatar-image" />,
}));

describe('DirectMessageHeader', () => {
  const otherUser = {
    name: 'John Doe',
    avatar: 'https://example.com/avatar.png',
    role: 'Admin',
  };

  it('renders the other user\'s name', () => {
    render(<DirectMessageHeader otherUser={otherUser} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders the other user\'s avatar', () => {
    render(<DirectMessageHeader otherUser={otherUser} />);
    expect(screen.getByAltText('John Doe')).toBeInTheDocument();
    expect(screen.getByTestId('mock-avatar-image')).toHaveAttribute('src', 'https://example.com/avatar.png');
  });

  it('renders the other user\'s role', () => {
    render(<DirectMessageHeader otherUser={otherUser} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});