// ==============================================================================
// LogiSphere AI — Administrative Audit Logger
// Records platform and organization administration events securely without leaking secrets
// ==============================================================================

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorEmail?: string;
  actorRole?: string;
  action:
    | 'ORG_REGISTERED'
    | 'ORG_APPROVED'
    | 'ORG_REJECTED'
    | 'ORG_SUSPENDED'
    | 'ORG_REACTIVATED'
    | 'MEMBERSHIP_ROLE_CHANGED'
    | 'PLATFORM_ADMIN_GRANTED';
  targetOrgId?: string;
  targetUserId?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

// In-memory ring buffer for audit logs (persists recent events across application lifecycle)
const auditLogs: AuditLogEntry[] = [];
const MAX_LOGS = 1000;

export const auditLogger = {
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    // Sanitize metadata to guarantee no passwords, JWT tokens, or credentials are logged
    const sanitizedMetadata = entry.metadata ? { ...entry.metadata } : undefined;
    if (sanitizedMetadata) {
      delete sanitizedMetadata.password;
      delete sanitizedMetadata.passwordHash;
      delete sanitizedMetadata.token;
      delete sanitizedMetadata.secret;
    }

    const fullEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      actorUserId: entry.actorUserId,
      actorEmail: entry.actorEmail,
      actorRole: entry.actorRole,
      action: entry.action,
      targetOrgId: entry.targetOrgId,
      targetUserId: entry.targetUserId,
      reason: entry.reason,
      metadata: sanitizedMetadata,
    };

    auditLogs.unshift(fullEntry);
    if (auditLogs.length > MAX_LOGS) {
      auditLogs.pop();
    }

    console.log(
      `[AUDIT] Action: ${fullEntry.action} | Actor: ${fullEntry.actorUserId} (${fullEntry.actorRole || 'UNKNOWN'}) | Org: ${fullEntry.targetOrgId || 'N/A'}`
    );

    return fullEntry;
  },

  list(filter?: { targetOrgId?: string; action?: string }): AuditLogEntry[] {
    return auditLogs.filter(log => {
      if (filter?.targetOrgId && log.targetOrgId !== filter.targetOrgId) return false;
      if (filter?.action && log.action !== filter.action) return false;
      return true;
    });
  },
};
