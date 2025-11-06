/**
 * Authorization (AuthZ) utilities
 *
 * Enforces role-based access control:
 * - OWNER: Full access (inherits Admin permissions)
 * - ADMIN: Write access to all resources
 * - MEMBER: Read-only access
 */

import type {
  NextApiRequest,
  NextApiResponse,
  GetServerSidePropsContext,
} from 'next';
import type { Session } from 'next-auth';
import { Role } from '@prisma/client';
import { getSession as getSessionFromLib } from './session';
import { prisma } from './prisma';

// Re-export getSession for convenience
export { getSession } from './session';

// ============================================================================
// Types
// ============================================================================

export interface SessionWithTeam extends Session {
  user: Session['user'] & {
    id: string;
    teamId?: string;
    role?: Role;
  };
}

export type AuthorizationCheck = 'read' | 'write' | 'admin' | 'owner';

export interface AuthorizationError {
  status: 403 | 401;
  message: string;
}

// ============================================================================
// Session Enhancement
// ============================================================================

/**
 * Gets session with team context
 *
 * Enhances the session with teamId and role information
 */
export async function getSessionWithTeam(
  req: NextApiRequest | GetServerSidePropsContext['req'],
  res: NextApiResponse | GetServerSidePropsContext['res'],
  teamId?: string
): Promise<SessionWithTeam | null> {
  const session = await getSessionFromLib(req, res) as SessionWithTeam | null;

  if (!session?.user?.id) {
    return null;
  }

  // If teamId is provided, fetch role for that team
  if (teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return null; // User is not a member of this team
    }

    session.user.teamId = teamId;
    session.user.role = membership.role;
  } else {
    // Otherwise, get the first team membership (default team)
    const membership = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'asc', // First team joined
      },
    });

    if (membership) {
      session.user.teamId = membership.teamId;
      session.user.role = membership.role;
    }
  }

  return session;
}

// ============================================================================
// Role Checks
// ============================================================================

/**
 * Checks if a role has write access
 *
 * OWNER and ADMIN have write access
 * MEMBER is read-only
 */
export function canWrite(role: Role | undefined): boolean {
  if (!role) return false;
  return role === Role.OWNER || role === Role.ADMIN;
}

/**
 * Checks if a role has admin access
 *
 * OWNER and ADMIN have admin access
 */
export function canAdmin(role: Role | undefined): boolean {
  if (!role) return false;
  return role === Role.OWNER || role === Role.ADMIN;
}

/**
 * Checks if a role is owner
 */
export function isOwner(role: Role | undefined): boolean {
  return role === Role.OWNER;
}

/**
 * Checks if a role has read access
 *
 * All authenticated roles have read access
 */
export function canRead(role: Role | undefined): boolean {
  if (!role) return false;
  return role === Role.OWNER || role === Role.ADMIN || role === Role.MEMBER;
}

// ============================================================================
// Authorization Enforcement
// ============================================================================

/**
 * Enforces authorization for API routes
 *
 * @param session - Session with team context
 * @param check - Type of authorization check ('read', 'write', 'admin', 'owner')
 * @returns Error object if authorization fails, undefined otherwise
 */
export function requireAuth(
  session: SessionWithTeam | null,
  check: AuthorizationCheck = 'read'
): AuthorizationError | undefined {
  // Check authentication
  if (!session || !session.user) {
    return {
      status: 401,
      message: 'Unauthorized - Please sign in',
    };
  }

  // Check team membership
  if (!session.user.teamId) {
    return {
      status: 403,
      message: 'Forbidden - No team membership',
    };
  }

  const role = session.user.role;

  // Check authorization
  switch (check) {
    case 'read':
      if (!canRead(role)) {
        return {
          status: 403,
          message: 'Forbidden - Read access required',
        };
      }
      break;

    case 'write':
      if (!canWrite(role)) {
        return {
          status: 403,
          message: 'Forbidden - Admin or Owner role required for write access',
        };
      }
      break;

    case 'admin':
      if (!canAdmin(role)) {
        return {
          status: 403,
          message: 'Forbidden - Admin or Owner role required',
        };
      }
      break;

    case 'owner':
      if (!isOwner(role)) {
        return {
          status: 403,
          message: 'Forbidden - Owner role required',
        };
      }
      break;
  }

  return undefined;
}

/**
 * Helper to send authorization error response
 */
export function sendAuthError(
  res: NextApiResponse,
  error: AuthorizationError
): void {
  res.status(error.status).json({ error: error.message });
}

/**
 * Middleware factory for API routes
 *
 * Usage:
 * ```
 * export default async function handler(req, res) {
 *   const session = await requireSession(req, res, 'write');
 *   if (!session) return; // Error already sent
 *
 *   // ... handle request
 * }
 * ```
 */
export async function requireSession(
  req: NextApiRequest,
  res: NextApiResponse,
  check: AuthorizationCheck = 'read',
  teamId?: string
): Promise<SessionWithTeam | null> {
  const session = await getSessionWithTeam(req, res, teamId);

  const error = requireAuth(session, check);
  if (error) {
    sendAuthError(res, error);
    return null;
  }

  return session;
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Quick authorization check for API routes
 *
 * Example:
 * ```
 * const session = await requireWriteAccess(req, res);
 * if (!session) return;
 * ```
 */
export async function requireReadAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId?: string
): Promise<SessionWithTeam | null> {
  return requireSession(req, res, 'read', teamId);
}

export async function requireWriteAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId?: string
): Promise<SessionWithTeam | null> {
  return requireSession(req, res, 'write', teamId);
}

export async function requireAdminAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId?: string
): Promise<SessionWithTeam | null> {
  return requireSession(req, res, 'admin', teamId);
}

export async function requireOwnerAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId?: string
): Promise<SessionWithTeam | null> {
  return requireSession(req, res, 'owner', teamId);
}
