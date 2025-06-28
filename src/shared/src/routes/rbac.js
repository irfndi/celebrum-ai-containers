"use strict";
/**
 * Role-Based Access Control (RBAC) system for managing user permissions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbacManager = exports.RBACManager = void 0;
class RBACManager {
    permissions = new Map();
    roles = new Map();
    userRoles = new Map();
    /**
     * Initialize RBAC with default permissions and roles
     */
    constructor() {
        this.initializeDefaultPermissions();
        this.initializeDefaultRoles();
    }
    /**
     * Initialize default system permissions
     */
    initializeDefaultPermissions() {
        const defaultPermissions = [
            // User management
            { id: 'user.read', name: 'Read User', description: 'View user information', resource: 'user', action: 'read' },
            { id: 'user.write', name: 'Write User', description: 'Create and update user information', resource: 'user', action: 'write' },
            { id: 'user.delete', name: 'Delete User', description: 'Delete user accounts', resource: 'user', action: 'delete' },
            { id: 'user.admin', name: 'Admin User', description: 'Full user administration', resource: 'user', action: 'admin' },
            // Portfolio management
            { id: 'portfolio.read', name: 'Read Portfolio', description: 'View portfolio information', resource: 'portfolio', action: 'read' },
            { id: 'portfolio.write', name: 'Write Portfolio', description: 'Create and update portfolios', resource: 'portfolio', action: 'write' },
            { id: 'portfolio.delete', name: 'Delete Portfolio', description: 'Delete portfolios', resource: 'portfolio', action: 'delete' },
            { id: 'portfolio.share', name: 'Share Portfolio', description: 'Share portfolios with others', resource: 'portfolio', action: 'share' },
            // Trading
            { id: 'trading.read', name: 'Read Trading', description: 'View trading data', resource: 'trading', action: 'read' },
            { id: 'trading.execute', name: 'Execute Trades', description: 'Execute trading orders', resource: 'trading', action: 'execute' },
            { id: 'trading.cancel', name: 'Cancel Trades', description: 'Cancel trading orders', resource: 'trading', action: 'cancel' },
            // Strategy management
            { id: 'strategy.read', name: 'Read Strategy', description: 'View trading strategies', resource: 'strategy', action: 'read' },
            { id: 'strategy.write', name: 'Write Strategy', description: 'Create and update strategies', resource: 'strategy', action: 'write' },
            { id: 'strategy.delete', name: 'Delete Strategy', description: 'Delete strategies', resource: 'strategy', action: 'delete' },
            { id: 'strategy.publish', name: 'Publish Strategy', description: 'Publish strategies publicly', resource: 'strategy', action: 'publish' },
            // Market data
            { id: 'market.read', name: 'Read Market Data', description: 'Access market data', resource: 'market', action: 'read' },
            { id: 'market.realtime', name: 'Real-time Market Data', description: 'Access real-time market data', resource: 'market', action: 'realtime' },
            // Analytics
            { id: 'analytics.read', name: 'Read Analytics', description: 'View analytics and reports', resource: 'analytics', action: 'read' },
            { id: 'analytics.export', name: 'Export Analytics', description: 'Export analytics data', resource: 'analytics', action: 'export' },
            // API access
            { id: 'api.read', name: 'API Read', description: 'Read access via API', resource: 'api', action: 'read' },
            { id: 'api.write', name: 'API Write', description: 'Write access via API', resource: 'api', action: 'write' },
            { id: 'api.admin', name: 'API Admin', description: 'Administrative API access', resource: 'api', action: 'admin' },
            // System administration
            { id: 'system.read', name: 'System Read', description: 'View system information', resource: 'system', action: 'read' },
            { id: 'system.write', name: 'System Write', description: 'Modify system settings', resource: 'system', action: 'write' },
            { id: 'system.admin', name: 'System Admin', description: 'Full system administration', resource: 'system', action: 'admin' },
            // Notifications
            { id: 'notification.read', name: 'Read Notifications', description: 'View notifications', resource: 'notification', action: 'read' },
            { id: 'notification.write', name: 'Write Notifications', description: 'Create and send notifications', resource: 'notification', action: 'write' },
            { id: 'notification.admin', name: 'Notification Admin', description: 'Manage notification system', resource: 'notification', action: 'admin' },
        ];
        defaultPermissions.forEach(permission => {
            this.permissions.set(permission.id, permission);
        });
    }
    /**
     * Initialize default system roles
     */
    initializeDefaultRoles() {
        const defaultRoles = [
            {
                id: 'guest',
                name: 'Guest',
                description: 'Limited read-only access',
                permissions: ['market.read'],
                isSystem: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'user',
                name: 'User',
                description: 'Standard user with basic trading capabilities',
                permissions: [
                    'user.read', 'portfolio.read', 'portfolio.write', 'portfolio.delete',
                    'trading.read', 'trading.execute', 'trading.cancel',
                    'strategy.read', 'strategy.write', 'strategy.delete',
                    'market.read', 'analytics.read', 'api.read', 'notification.read'
                ],
                isSystem: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'premium',
                name: 'Premium User',
                description: 'Premium user with advanced features',
                permissions: [
                    'user.read', 'portfolio.read', 'portfolio.write', 'portfolio.delete', 'portfolio.share',
                    'trading.read', 'trading.execute', 'trading.cancel',
                    'strategy.read', 'strategy.write', 'strategy.delete', 'strategy.publish',
                    'market.read', 'market.realtime', 'analytics.read', 'analytics.export',
                    'api.read', 'api.write', 'notification.read', 'notification.write'
                ],
                isSystem: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'admin',
                name: 'Administrator',
                description: 'Full system administration access',
                permissions: [
                    'user.read', 'user.write', 'user.delete', 'user.admin',
                    'portfolio.read', 'portfolio.write', 'portfolio.delete', 'portfolio.share',
                    'trading.read', 'trading.execute', 'trading.cancel',
                    'strategy.read', 'strategy.write', 'strategy.delete', 'strategy.publish',
                    'market.read', 'market.realtime', 'analytics.read', 'analytics.export',
                    'api.read', 'api.write', 'api.admin',
                    'system.read', 'system.write', 'system.admin',
                    'notification.read', 'notification.write', 'notification.admin'
                ],
                isSystem: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        defaultRoles.forEach(role => {
            this.roles.set(role.id, role);
        });
    }
    /**
     * Check if a user has permission to perform an action on a resource
     */
    async hasPermission(context) {
        const userRoles = this.getUserRoles(context.userId);
        // Check if user has any active roles
        const activeRoles = userRoles.filter(ur => ur.isActive && (!ur.expiresAt || new Date(ur.expiresAt) > new Date()));
        if (activeRoles.length === 0) {
            return false;
        }
        // Check permissions for each active role
        for (const userRole of activeRoles) {
            const role = this.roles.get(userRole.roleId);
            if (!role)
                continue;
            // Check if role has the required permission
            const permissionId = `${context.resource}.${context.action}`;
            if (role.permissions.includes(permissionId)) {
                const permission = this.permissions.get(permissionId);
                if (permission && this.evaluateConditions(permission, context)) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Evaluate permission conditions
     */
    evaluateConditions(permission, _context) {
        if (!permission.conditions) {
            return true;
        }
        // Implement condition evaluation logic here
        // For example, check if user owns the resource, time-based restrictions, etc.
        return true; // Simplified for now
    }
    /**
     * Get user roles
     */
    getUserRoles(userId) {
        return this.userRoles.get(userId) || [];
    }
    /**
     * Assign role to user
     */
    assignRole(userId, roleId, assignedBy, expiresAt) {
        if (!this.roles.has(roleId)) {
            return false;
        }
        const userRoles = this.getUserRoles(userId);
        const existingRole = userRoles.find(ur => ur.roleId === roleId && ur.isActive);
        if (existingRole) {
            return false; // Role already assigned
        }
        const newUserRole = {
            userId,
            roleId,
            assignedBy,
            assignedAt: new Date().toISOString(),
            expiresAt,
            isActive: true
        };
        userRoles.push(newUserRole);
        this.userRoles.set(userId, userRoles);
        return true;
    }
    /**
     * Remove role from user
     */
    removeRole(userId, roleId) {
        const userRoles = this.getUserRoles(userId);
        const roleIndex = userRoles.findIndex(ur => ur.roleId === roleId && ur.isActive);
        if (roleIndex === -1) {
            return false;
        }
        userRoles[roleIndex].isActive = false;
        this.userRoles.set(userId, userRoles);
        return true;
    }
    /**
     * Create a new permission
     */
    createPermission(permission) {
        if (this.permissions.has(permission.id)) {
            return false;
        }
        this.permissions.set(permission.id, permission);
        return true;
    }
    /**
     * Create a new role
     */
    createRole(role) {
        if (this.roles.has(role.id)) {
            return false;
        }
        // Validate that all permissions exist
        for (const permissionId of role.permissions) {
            if (!this.permissions.has(permissionId)) {
                return false;
            }
        }
        this.roles.set(role.id, role);
        return true;
    }
    /**
     * Get all permissions
     */
    getPermissions() {
        return Array.from(this.permissions.values());
    }
    /**
     * Get all roles
     */
    getRoles() {
        return Array.from(this.roles.values());
    }
    /**
     * Get role by ID
     */
    getRole(roleId) {
        return this.roles.get(roleId);
    }
    /**
     * Get permission by ID
     */
    getPermission(permissionId) {
        return this.permissions.get(permissionId);
    }
    /**
     * Middleware function for protecting routes
     */
    createMiddleware(resource, action) {
        return async (_request, userId) => {
            const context = {
                userId,
                roles: this.getUserRoles(userId).map(ur => ur.roleId),
                resource,
                action
            };
            const hasAccess = await this.hasPermission(context);
            if (!hasAccess) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Insufficient permissions to access this resource',
                        status: 403
                    }
                }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return null; // Allow request to proceed
        };
    }
}
exports.RBACManager = RBACManager;
// Export a singleton instance
exports.rbacManager = new RBACManager();
//# sourceMappingURL=rbac.js.map