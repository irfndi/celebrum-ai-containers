/**
 * Role-Based Access Control (RBAC) system for managing user permissions
 */
export interface Permission {
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
    conditions?: Record<string, unknown>;
}
export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    isSystem: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface UserRole {
    userId: string;
    roleId: string;
    assignedBy: string;
    assignedAt: string;
    expiresAt?: string;
    isActive: boolean;
}
export interface AccessContext {
    userId: string;
    roles: string[];
    resource: string;
    action: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
}
export declare class RBACManager {
    private permissions;
    private roles;
    private userRoles;
    /**
     * Initialize RBAC with default permissions and roles
     */
    constructor();
    /**
     * Initialize default system permissions
     */
    private initializeDefaultPermissions;
    /**
     * Initialize default system roles
     */
    private initializeDefaultRoles;
    /**
     * Check if a user has permission to perform an action on a resource
     */
    hasPermission(context: AccessContext): Promise<boolean>;
    /**
     * Evaluate permission conditions
     */
    private evaluateConditions;
    /**
     * Get user roles
     */
    getUserRoles(userId: string): UserRole[];
    /**
     * Assign role to user
     */
    assignRole(userId: string, roleId: string, assignedBy: string, expiresAt?: string): boolean;
    /**
     * Remove role from user
     */
    removeRole(userId: string, roleId: string): boolean;
    /**
     * Create a new permission
     */
    createPermission(permission: Permission): boolean;
    /**
     * Create a new role
     */
    createRole(role: Role): boolean;
    /**
     * Get all permissions
     */
    getPermissions(): Permission[];
    /**
     * Get all roles
     */
    getRoles(): Role[];
    /**
     * Get role by ID
     */
    getRole(roleId: string): Role | undefined;
    /**
     * Get permission by ID
     */
    getPermission(permissionId: string): Permission | undefined;
    /**
     * Middleware function for protecting routes
     */
    createMiddleware(resource: string, action: string): (_request: Request, userId: string) => Promise<Response | null>;
}
export declare const rbacManager: RBACManager;
//# sourceMappingURL=rbac.d.ts.map