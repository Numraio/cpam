/**
 * Tests for Authorization (AuthZ)
 */

import { Role } from '@prisma/client';
import {
  canRead,
  canWrite,
  canAdmin,
  isOwner,
  requireAuth,
  type SessionWithTeam,
} from '@/lib/authz';

describe('Role Checks', () => {
  it('canRead - all roles can read', () => {
    expect(canRead(Role.OWNER)).toBe(true);
    expect(canRead(Role.ADMIN)).toBe(true);
    expect(canRead(Role.MEMBER)).toBe(true);
    expect(canRead(undefined)).toBe(false);
  });

  it('canWrite - only OWNER and ADMIN can write', () => {
    expect(canWrite(Role.OWNER)).toBe(true);
    expect(canWrite(Role.ADMIN)).toBe(true);
    expect(canWrite(Role.MEMBER)).toBe(false);
    expect(canWrite(undefined)).toBe(false);
  });

  it('canAdmin - only OWNER and ADMIN have admin access', () => {
    expect(canAdmin(Role.OWNER)).toBe(true);
    expect(canAdmin(Role.ADMIN)).toBe(true);
    expect(canAdmin(Role.MEMBER)).toBe(false);
    expect(canAdmin(undefined)).toBe(false);
  });

  it('isOwner - only OWNER role', () => {
    expect(isOwner(Role.OWNER)).toBe(true);
    expect(isOwner(Role.ADMIN)).toBe(false);
    expect(isOwner(Role.MEMBER)).toBe(false);
    expect(isOwner(undefined)).toBe(false);
  });
});

describe('requireAuth - Authorization Enforcement', () => {
  it('returns 401 if no session', () => {
    const error = requireAuth(null, 'read');
    expect(error).toEqual({
      status: 401,
      message: 'Unauthorized - Please sign in',
    });
  });

  it('returns 403 if no teamId', () => {
    const session: SessionWithTeam = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
      },
      expires: new Date().toISOString(),
    };

    const error = requireAuth(session, 'read');
    expect(error).toEqual({
      status: 403,
      message: 'Forbidden - No team membership',
    });
  });

  it('allows read access for all roles', () => {
    const sessionMember: SessionWithTeam = {
      user: {
        id: 'user-1',
        email: 'member@example.com',
        teamId: 'team-1',
        role: Role.MEMBER,
      },
      expires: new Date().toISOString(),
    };

    const error = requireAuth(sessionMember, 'read');
    expect(error).toBeUndefined();
  });

  it('denies write access for MEMBER', () => {
    const sessionMember: SessionWithTeam = {
      user: {
        id: 'user-1',
        email: 'member@example.com',
        teamId: 'team-1',
        role: Role.MEMBER,
      },
      expires: new Date().toISOString(),
    };

    const error = requireAuth(sessionMember, 'write');
    expect(error).toEqual({
      status: 403,
      message: 'Forbidden - Admin or Owner role required for write access',
    });
  });

  it('allows write access for ADMIN', () => {
    const sessionAdmin: SessionWithTeam = {
      user: {
        id: 'user-2',
        email: 'admin@example.com',
        teamId: 'team-1',
        role: Role.ADMIN,
      },
      expires: new Date().toISOString(),
    };

    const error = requireAuth(sessionAdmin, 'write');
    expect(error).toBeUndefined();
  });

  it('allows write access for OWNER', () => {
    const sessionOwner: SessionWithTeam = {
      user: {
        id: 'user-3',
        email: 'owner@example.com',
        teamId: 'team-1',
        role: Role.OWNER,
      },
      expires: new Date().toISOString(),
    };

    const error = requireAuth(sessionOwner, 'write');
    expect(error).toBeUndefined();
  });

  it('denies admin access for MEMBER', () => {
    const sessionMember: SessionWithTeam = {
      user: {
        id: 'user-1',
        email: 'member@example.com',
        teamId: 'team-1',
        role: Role.MEMBER,
      },
      expires: new Date().toISOString(),
    };

    const error = requireAuth(sessionMember, 'admin');
    expect(error).toEqual({
      status: 403,
      message: 'Forbidden - Admin or Owner role required',
    });
  });

  it('allows admin access for ADMIN', () => {
    const sessionAdmin: SessionWithTeam = {
      user: {
        id: 'user-2',
        email: 'admin@example.com',
        teamId: 'team-1',
        role: Role.ADMIN,
      },
      expires: new Date().toISOString(),
    };

    const error = requireAuth(sessionAdmin, 'admin');
    expect(error).toBeUndefined();
  });

  it('denies owner access for ADMIN', () => {
    const sessionAdmin: SessionWithTeam = {
      user: {
        id: 'user-2',
        email: 'admin@example.com',
        teamId: 'team-1',
        role: Role.ADMIN,
      },
      expires: new Date().toISOString(),
    };

    const error = requireAuth(sessionAdmin, 'owner');
    expect(error).toEqual({
      status: 403,
      message: 'Forbidden - Owner role required',
    });
  });

  it('allows owner access for OWNER', () => {
    const sessionOwner: SessionWithTeam = {
      user: {
        id: 'user-3',
        email: 'owner@example.com',
        teamId: 'team-1',
        role: Role.OWNER,
      },
      expires: new Date().toISOString(),
    };

    const error = requireAuth(sessionOwner, 'owner');
    expect(error).toBeUndefined();
  });
});

describe('Acceptance Tests', () => {
  it('Given a MEMBER, when checking write access, then 403 is returned', () => {
    const sessionMember: SessionWithTeam = {
      user: {
        id: 'user-1',
        email: 'member@example.com',
        teamId: 'team-1',
        role: Role.MEMBER,
      },
      expires: new Date().toISOString(),
    };

    const error = requireAuth(sessionMember, 'write');

    expect(error).toBeDefined();
    expect(error?.status).toBe(403);
    expect(error?.message).toContain('Admin or Owner role required');
  });

  it('Given an ADMIN, when checking write access, then access is granted', () => {
    const sessionAdmin: SessionWithTeam = {
      user: {
        id: 'user-2',
        email: 'admin@example.com',
        teamId: 'team-1',
        role: Role.ADMIN,
      },
      expires: new Date().toISOString(),
    };

    const error = requireAuth(sessionAdmin, 'write');

    expect(error).toBeUndefined();
  });

  it('Given an unauthenticated user, when checking any access, then 401 is returned', () => {
    const error = requireAuth(null, 'read');

    expect(error).toBeDefined();
    expect(error?.status).toBe(401);
    expect(error?.message).toContain('Unauthorized');
  });
});
