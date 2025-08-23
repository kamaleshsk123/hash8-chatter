import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Trash2, 
  UserMinus, 
  Clock, 
  AlertTriangle,
  Activity,
  Users,
  MessageSquare
} from 'lucide-react';
import { getModerationActions } from '@/services/firebase';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole, ModerationAction } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface ModerationDashboardProps {
  organizationId: string;
  currentUserRole: UserRole;
  onClose?: () => void;
}

export const ModerationDashboard: React.FC<ModerationDashboardProps> = ({
  organizationId,
  currentUserRole,
  onClose,
}) => {
  const [moderationActions, setModerationActions] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const permissions = usePermissions(currentUserRole);

  useEffect(() => {
    if (permissions.canAccessModerationDashboard) {
      loadModerationActions();
    }
  }, [organizationId, permissions.canAccessModerationDashboard]);

  const loadModerationActions = async () => {
    try {
      setLoading(true);
      const actions = await getModerationActions(organizationId, 20);
      setModerationActions(actions);
    } catch (error) {
      console.error('Error loading moderation actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'delete_message':
        return <MessageSquare className="w-4 h-4 text-red-600" />;
      case 'ban_user':
        return <UserMinus className="w-4 h-4 text-red-600" />;
      case 'promote_user':
        return <Shield className="w-4 h-4 text-green-600" />;
      case 'demote_user':
        return <Users className="w-4 h-4 text-orange-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'delete_message':
      case 'ban_user':
        return 'destructive';
      case 'promote_user':
        return 'default';
      case 'demote_user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'delete_message':
        return 'Message Deleted';
      case 'ban_user':
        return 'User Banned';
      case 'promote_user':
        return 'User Promoted';
      case 'demote_user':
        return 'User Demoted';
      default:
        return actionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (!permissions.canAccessModerationDashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            You don't have permission to access the moderation dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Moderation Dashboard</h2>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{moderationActions.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 20 moderation actions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Deleted</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {moderationActions.filter(a => a.actionType === 'delete_message').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Messages removed by moderators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Actions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {moderationActions.filter(a => 
                ['ban_user', 'promote_user', 'demote_user'].includes(a.actionType)
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              User management actions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Moderation Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading moderation actions...</div>
            </div>
          ) : moderationActions.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Actions Yet</h3>
              <p className="text-muted-foreground">
                No moderation actions have been taken in this organization.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {moderationActions.map((action, index) => (
                <div key={action.id}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(action.actionType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getActionColor(action.actionType) as any} className="text-xs">
                          {getActionLabel(action.actionType)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          by {action.moderatorName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(action.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      
                      {action.targetName && (
                        <p className="text-sm font-medium mb-1">
                          Target: {action.targetName}
                        </p>
                      )}
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        Reason: {action.reason}
                      </p>
                      
                      {action.details && (
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          {action.actionType === 'delete_message' && action.details.originalText && (
                            <p>Original text: "{action.details.originalText}"</p>
                          )}
                          {action.actionType === 'ban_user' && (
                            <p>
                              Duration: {action.details.permanent ? 'Permanent' : `${action.details.duration} hours`}
                            </p>
                          )}
                          {(action.actionType === 'promote_user' || action.actionType === 'demote_user') && (
                            <p>
                              Role changed from {action.details.previousRole} to {action.details.newRole}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {index < moderationActions.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};