import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, User } from 'lucide-react';
import { UserRole } from '@/types';
import { getRoleDisplayName } from '@/hooks/usePermissions';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  variant?: 'default' | 'outline' | 'secondary';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ 
  role, 
  size = 'md', 
  showIcon = true,
  variant = 'outline'
}) => {
  const getRoleIcon = (role: UserRole) => {
    const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
    
    switch (role) {
      case 'admin':
        return <Crown className={`${iconSize} text-yellow-600`} />;
      case 'moderator':
        return <Shield className={`${iconSize} text-blue-600`} />;
      case 'member':
        return <User className={`${iconSize} text-gray-600`} />;
      default:
        return <User className={`${iconSize} text-gray-600`} />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'border-yellow-200 text-yellow-800 bg-yellow-50 dark:border-yellow-800 dark:text-yellow-200 dark:bg-yellow-900/20';
      case 'moderator':
        return 'border-blue-200 text-blue-800 bg-blue-50 dark:border-blue-800 dark:text-blue-200 dark:bg-blue-900/20';
      case 'member':
        return 'border-gray-200 text-gray-700 bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800/20';
      default:
        return 'border-gray-200 text-gray-700 bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800/20';
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <Badge 
      variant={variant}
      className={`
        flex items-center gap-1 
        ${sizeClasses[size]} 
        ${variant === 'outline' ? getRoleColor(role) : ''}
      `}
    >
      {showIcon && getRoleIcon(role)}
      {getRoleDisplayName(role)}
    </Badge>
  );
};