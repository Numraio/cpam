# Authorization (AuthZ)

Role-based access control for API routes and server actions.

## Overview

The authorization system enforces a three-tier role model:
- **OWNER**: Full access (billing, deletion, invites)
- **ADMIN**: Write access (create/edit/approve)
- **MEMBER**: Read-only access

## Role Definitions

### OWNER
- Full access to all resources
- Can manage billing and subscriptions
- Can delete teams
- Can manage team members and invites
- Inherits all ADMIN permissions

### ADMIN
- Can create, edit, and approve pricing data
- Can run calculations
- Can manage contracts, items, and PAMs
- Can view all resources
- **Cannot** manage billing or delete teams

### MEMBER
- **Read-only** access to all resources
- Can view contracts, items, PAMs, and calculations
- Can view reports
- **Cannot** create, edit, approve, or delete anything

## Usage

### Basic API Route Authorization

```typescript
import { requireWriteAccess } from '@/lib/authz';

export default async function handler(req, res) {
  // Require write access (ADMIN or OWNER)
  const session = await requireWriteAccess(req, res);
  if (!session) return; // Error already sent (403 or 401)

  const tenantId = session.user.teamId;
  const userId = session.user.id;

  // ... handle request
}
```

### Different Authorization Levels

```typescript
import {
  requireReadAccess,
  requireWriteAccess,
  requireAdminAccess,
  requireOwnerAccess,
} from '@/lib/authz';

// Read access (any role)
export async function getContracts(req, res) {
  const session = await requireReadAccess(req, res);
  if (!session) return;

  // All roles can read
}

// Write access (ADMIN or OWNER)
export async function createContract(req, res) {
  const session = await requireWriteAccess(req, res);
  if (!session) return;

  // Only ADMIN and OWNER can create
}

// Admin access (ADMIN or OWNER)
export async function inviteUser(req, res) {
  const session = await requireAdminAccess(req, res);
  if (!session) return;

  // Only ADMIN and OWNER can invite
}

// Owner-only access
export async function deleteTeam(req, res) {
  const session = await requireOwnerAccess(req, res);
  if (!session) return;

  // Only OWNER can delete
}
```

### Manual Authorization Checks

```typescript
import { getSessionWithTeam, requireAuth, sendAuthError } from '@/lib/authz';

export default async function handler(req, res) {
  // Get session with team context
  const session = await getSessionWithTeam(req, res);

  // Check authorization
  const error = requireAuth(session, 'write');
  if (error) {
    sendAuthError(res, error);
    return;
  }

  // ... handle request
}
```

### Role-Based Logic

```typescript
import { canWrite, canAdmin, isOwner } from '@/lib/authz';

export default async function handler(req, res) {
  const session = await getSessionWithTeam(req, res);

  // Check specific permissions
  if (canWrite(session?.user?.role)) {
    // Allow write operation
  }

  if (canAdmin(session?.user?.role)) {
    // Allow admin operation
  }

  if (isOwner(session?.user?.role)) {
    // Owner-only logic
  }
}
```

## API Functions

### Session Management

#### `getSessionWithTeam(req, res, teamId?)`
Gets session with team context and role information.

```typescript
const session = await getSessionWithTeam(req, res);
// session.user.teamId - Current team ID
// session.user.role - Role in current team
```

### Authorization Checks

#### `requireAuth(session, check)`
Validates authorization level.

**Parameters:**
- `session` - Session with team context
- `check` - Authorization level: `'read'`, `'write'`, `'admin'`, or `'owner'`

**Returns:**
- `undefined` if authorized
- `{ status: 401 | 403, message: string }` if unauthorized

```typescript
const error = requireAuth(session, 'write');
if (error) {
  // Not authorized
}
```

### Convenience Functions

#### `requireReadAccess(req, res, teamId?)`
Requires read access (any authenticated role).

#### `requireWriteAccess(req, res, teamId?)`
Requires write access (ADMIN or OWNER).

#### `requireAdminAccess(req, res, teamId?)`
Requires admin access (ADMIN or OWNER).

#### `requireOwnerAccess(req, res, teamId?)`
Requires owner access (OWNER only).

**Returns:**
- `SessionWithTeam` if authorized
- `null` if unauthorized (error already sent to client)

### Role Checks

#### `canRead(role)`
Returns `true` if role has read access.

#### `canWrite(role)`
Returns `true` if role has write access (ADMIN or OWNER).

#### `canAdmin(role)`
Returns `true` if role has admin access (ADMIN or OWNER).

#### `isOwner(role)`
Returns `true` if role is OWNER.

### Error Handling

#### `sendAuthError(res, error)`
Sends authorization error response.

```typescript
const error = requireAuth(session, 'write');
if (error) {
  sendAuthError(res, error);
  return;
}
```

## HTTP Method Authorization

Recommended authorization by HTTP method:

```typescript
export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
    case 'HEAD':
      // Read access
      const readSession = await requireReadAccess(req, res);
      if (!readSession) return;
      // ... handle read
      break;

    case 'POST':
    case 'PUT':
    case 'PATCH':
      // Write access
      const writeSession = await requireWriteAccess(req, res);
      if (!writeSession) return;
      // ... handle write
      break;

    case 'DELETE':
      // Admin/Owner access
      const adminSession = await requireAdminAccess(req, res);
      if (!adminSession) return;
      // ... handle delete
      break;

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
```

## Response Status Codes

### 401 Unauthorized
Returned when:
- No session exists (user not signed in)
- Session is invalid or expired

**Client Action**: Redirect to `/auth/login`

### 403 Forbidden
Returned when:
- User is authenticated but lacks required role
- User is not a member of the requested team
- MEMBER tries to perform write operation

**Client Action**: Show "Access Denied" message

## Examples

### Example 1: Protected Read Endpoint

```typescript
// GET /api/contracts
import { requireReadAccess } from '@/lib/authz';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireReadAccess(req, res);
  if (!session) return;

  const tenantId = session.user.teamId!;

  const contracts = await prisma.contract.findMany({
    where: { tenantId },
  });

  return res.status(200).json({ contracts });
}
```

### Example 2: Protected Write Endpoint

```typescript
// POST /api/contracts
import { requireWriteAccess } from '@/lib/authz';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireWriteAccess(req, res);
  if (!session) return; // 403 sent for MEMBER

  const tenantId = session.user.teamId!;
  const { name, description } = req.body;

  const contract = await prisma.contract.create({
    data: {
      tenantId,
      name,
      description,
      createdBy: session.user.id,
    },
  });

  return res.status(201).json({ contract });
}
```

### Example 3: Role-Specific Logic

```typescript
// GET /api/team/members
import { getSessionWithTeam, requireAuth, canAdmin } from '@/lib/authz';

export default async function handler(req, res) {
  const session = await getSessionWithTeam(req, res);

  const error = requireAuth(session, 'read');
  if (error) {
    sendAuthError(res, error);
    return;
  }

  const tenantId = session.user.teamId!;

  // Fetch team members
  const members = await prisma.teamMember.findMany({
    where: { teamId: tenantId },
    include: { user: true },
  });

  // Hide sensitive data for non-admins
  if (!canAdmin(session.user.role)) {
    // Members can only see basic info
    return res.status(200).json({
      members: members.map(m => ({
        id: m.id,
        name: m.user.name,
        role: m.role,
      })),
    });
  }

  // Admins see full details
  return res.status(200).json({ members });
}
```

### Example 4: Owner-Only Endpoint

```typescript
// DELETE /api/team
import { requireOwnerAccess } from '@/lib/authz';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireOwnerAccess(req, res);
  if (!session) return; // 403 for ADMIN and MEMBER

  const tenantId = session.user.teamId!;

  // Delete team (cascade deletes all related data)
  await prisma.team.delete({
    where: { id: tenantId },
  });

  return res.status(200).json({ message: 'Team deleted' });
}
```

## Integration with Next.js Middleware

For page-level protection, use `getServerSideProps`:

```typescript
import { getSessionWithTeam, requireAuth } from '@/lib/authz';
import type { GetServerSidePropsContext } from 'next';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSessionWithTeam(context.req, context.res);

  const error = requireAuth(session, 'read');
  if (error) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
}
```

## Testing Authorization

### Unit Tests

```typescript
import { canWrite, requireAuth } from '@/lib/authz';
import { Role } from '@prisma/client';

it('MEMBER cannot write', () => {
  expect(canWrite(Role.MEMBER)).toBe(false);
});

it('ADMIN can write', () => {
  expect(canWrite(Role.ADMIN)).toBe(true);
});

it('requireAuth returns 403 for MEMBER write access', () => {
  const session = {
    user: {
      id: 'user-1',
      email: 'member@example.com',
      teamId: 'team-1',
      role: Role.MEMBER,
    },
    expires: new Date().toISOString(),
  };

  const error = requireAuth(session, 'write');
  expect(error?.status).toBe(403);
});
```

### Integration Tests

```typescript
import { createMocks } from 'node-mocks-http';

it('POST /api/contracts returns 403 for MEMBER', async () => {
  const { req, res } = createMocks({
    method: 'POST',
    body: { name: 'Test Contract' },
  });

  // Mock session with MEMBER role
  jest.spyOn(authz, 'requireWriteAccess').mockResolvedValue(null);

  await handler(req, res);

  expect(res._getStatusCode()).toBe(403);
});
```

## Security Best Practices

### 1. Always Check Authorization Server-Side
Never rely on client-side authorization alone.

```typescript
// ✅ Good: Server-side check
export default async function handler(req, res) {
  const session = await requireWriteAccess(req, res);
  if (!session) return;
  // ...
}

// ❌ Bad: Client-side only
// User can bypass this check
```

### 2. Use Specific Authorization Levels
Use the most restrictive level needed.

```typescript
// ✅ Good: Read endpoint uses requireReadAccess
const session = await requireReadAccess(req, res);

// ❌ Bad: Read endpoint uses requireOwnerAccess
// Unnecessarily restricts access
```

### 3. Validate Team Context
Always validate the user has access to the requested team.

```typescript
const { teamId } = req.query;
const session = await getSessionWithTeam(req, res, teamId);
// If user is not a member, session will be null
```

### 4. Audit Authorization Failures
Log authorization failures for security monitoring.

```typescript
const error = requireAuth(session, 'write');
if (error) {
  auditLog.log({
    action: 'AUTHORIZATION_FAILURE',
    userId: session?.user?.id,
    requiredLevel: 'write',
    actualRole: session?.user?.role,
  });
  sendAuthError(res, error);
  return;
}
```

## Migration Guide

### Updating Existing API Routes

**Before:**
```typescript
const session = await getSession(req, res);
if (!session) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

**After:**
```typescript
import { requireWriteAccess } from '@/lib/authz';

const session = await requireWriteAccess(req, res);
if (!session) return; // Error already sent
```

## Related Documentation

- [Authentication](./authentication.md) - Sign-in flow and providers
- [Multi-tenancy](./multi-tenancy.md) - Team isolation
- [Audit Logging](./audit-logging.md) - Authorization events

## Troubleshooting

### "Forbidden - No team membership"
**Cause**: User is authenticated but not a member of any team.

**Solution**: Ensure users are added to a team during onboarding.

### "Forbidden - Admin or Owner role required"
**Cause**: MEMBER role trying to perform write operation.

**Solution**: Promote user to ADMIN or OWNER role, or use a different account.

### Authorization not working in development
**Cause**: Session cookie not being set correctly.

**Solution**: Check `NEXTAUTH_URL` environment variable and ensure it matches your development URL.
