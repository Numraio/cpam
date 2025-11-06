# Provider Credentials

Secure storage and management of provider API credentials using envelope encryption.

## Overview

Provider credentials are sensitive API keys, secrets, and authentication tokens required to fetch data from external providers like Platts, OANDA, Argus, etc. The credential system provides:

- **Envelope encryption** - Two-layer encryption (DEK + master key)
- **Tenant isolation** - Hard isolation via tenantId
- **Owner-only access** - Only OWNER role can manage credentials
- **Rotation support** - Update secrets without changing metadata
- **Expiration tracking** - Optional expiration dates
- **Usage tracking** - lastUsedAt timestamps
- **Audit trail** - Created/updated/rotated timestamps

## Security Model

### Envelope Encryption

Credentials use **envelope encryption** with two layers:

1. **Data Encryption Key (DEK)** - Random 256-bit key encrypts the actual credential
2. **Master Encryption Key (MEK)** - Encrypts the DEK

**Why envelope encryption?**
- Key rotation: Only need to re-encrypt DEK, not all data
- Performance: Encrypt large data with fast symmetric key (DEK)
- Security: Master key never touches the data directly

### Encryption Algorithm

- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key derivation**: PBKDF2 with 100,000 iterations + random salt
- **IV**: Random 128-bit initialization vector per encryption
- **Authentication**: GCM provides built-in authentication tag

### Master Key Configuration

The master encryption key MUST be configured via environment variable:

```bash
# Generate a secure 256-bit key (base64-encoded)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Set in environment
export ENCRYPTION_MASTER_KEY="your-generated-key-here"
```

**Production recommendations:**
- Use AWS KMS, GCP KMS, or Azure Key Vault
- Never commit master key to version control
- Rotate master key annually
- Use different keys per environment (dev/staging/prod)

## Schema

```prisma
model ProviderCredential {
  id          String    @id @default(uuid())
  tenantId    String
  provider    String    // "PLATTS", "OANDA", "ARGUS", etc.
  name        String    // User-friendly name
  description String?

  // Encrypted credential data (JSON blob of EncryptedEnvelope)
  encryptedData String  @db.Text

  // Metadata
  createdBy     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastUsedAt    DateTime?
  lastRotatedAt DateTime?
  expiresAt     DateTime?

  tenant Team @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, provider, name])
  @@index([tenantId])
  @@index([provider])
}
```

## API Endpoints

All endpoints require **OWNER** role.

### Create Credential

```http
POST /api/provider-credentials
Content-Type: application/json

{
  "provider": "PLATTS",
  "name": "Production API",
  "description": "Platts production credentials",
  "credentials": {
    "apiKey": "platts_key_123",
    "apiSecret": "platts_secret_456"
  },
  "expiresAt": "2025-12-31T00:00:00Z"
}
```

**Response (201 Created):**
```json
{
  "id": "cred-123",
  "tenantId": "team-456",
  "provider": "PLATTS",
  "name": "Production API",
  "description": "Platts production credentials",
  "createdBy": "user-789",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "expiresAt": "2025-12-31T00:00:00Z"
}
```

**Security:** Response does NOT include `credentials` or `encryptedData`.

### List Credentials

```http
GET /api/provider-credentials?provider=PLATTS
```

**Response (200 OK):**
```json
[
  {
    "id": "cred-123",
    "tenantId": "team-456",
    "provider": "PLATTS",
    "name": "Production API",
    "description": "Platts production credentials",
    "createdBy": "user-789",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "lastUsedAt": "2024-02-10T14:30:00Z",
    "lastRotatedAt": "2024-01-20T09:00:00Z",
    "expiresAt": "2025-12-31T00:00:00Z"
  }
]
```

**Query parameters:**
- `provider` (optional) - Filter by provider name

### Get Credential

```http
GET /api/provider-credentials/cred-123
```

**Response (200 OK):**
Same structure as list endpoint.

### Update Credential Metadata

```http
PATCH /api/provider-credentials/cred-123
Content-Type: application/json

{
  "name": "Production API (Updated)",
  "description": "Updated description",
  "expiresAt": "2026-12-31T00:00:00Z"
}
```

**Response (200 OK):**
Updated credential metadata.

**Note:** This endpoint updates metadata only. To update credentials, use rotation endpoint.

### Delete Credential

```http
DELETE /api/provider-credentials/cred-123
```

**Response (204 No Content)**

### Rotate Credential

```http
POST /api/provider-credentials/cred-123/rotate
Content-Type: application/json

{
  "credentials": {
    "apiKey": "new_key_789",
    "apiSecret": "new_secret_012"
  }
}
```

**Response (200 OK):**
```json
{
  "id": "cred-123",
  "tenantId": "team-456",
  "provider": "PLATTS",
  "name": "Production API",
  "lastRotatedAt": "2024-02-15T10:00:00Z",
  ...
}
```

**Use cases:**
- Periodic credential rotation (security policy)
- Credential compromise (emergency rotation)
- Provider credential changes

## Internal Usage

For internal use within the application (e.g., fetching provider data), use the utility functions:

```typescript
import { getProviderCredential } from '@/lib/provider-credentials';

// Retrieve and decrypt credentials
const credentials = await getProviderCredential(
  tenantId,
  'PLATTS',
  'Production API'
);

if (!credentials) {
  throw new Error('Credential not found');
}

// Use credentials to call provider API
const response = await fetch('https://api.platts.com/data', {
  headers: {
    'X-API-Key': credentials.apiKey,
    'X-API-Secret': credentials.apiSecret,
  },
});
```

**Important:**
- Credentials are decrypted in memory only
- Never log decrypted credentials
- Never include credentials in error messages
- Handle credentials securely throughout the request lifecycle

## Usage Tracking

The system automatically tracks when credentials are used:

```typescript
// When getProviderCredential() is called, lastUsedAt is updated
const credentials = await getProviderCredential(tenantId, 'PLATTS', 'Production API');
// lastUsedAt is now set to current timestamp
```

**Benefits:**
- Identify unused credentials
- Detect suspicious usage patterns
- Support compliance audits

## Expiration

Credentials can have optional expiration dates:

```typescript
// Check if credential is expired
const isExpired = await isCredentialExpired(tenantId, 'PLATTS', 'Production API');

if (isExpired) {
  console.error('Credential has expired - rotation required');
}
```

**Behavior:**
- `getProviderCredential()` throws error for expired credentials
- API returns expired credentials in list (for visibility)
- Owners must rotate or update expiresAt date

## Rotation Best Practices

### Scheduled Rotation

Rotate credentials on a regular schedule:

```typescript
// Quarterly rotation policy
async function rotateCredentialIfNeeded(credentialId: string) {
  const credential = await prisma.providerCredential.findUnique({
    where: { id: credentialId },
  });

  const monthsSinceRotation = credential.lastRotatedAt
    ? monthsBetween(credential.lastRotatedAt, new Date())
    : monthsBetween(credential.createdAt, new Date());

  if (monthsSinceRotation >= 3) {
    console.log('Credential due for rotation');
    // Notify owner to rotate
  }
}
```

### Emergency Rotation

In case of compromise:

1. Immediately rotate via API
2. Audit credential usage (check lastUsedAt)
3. Review audit logs for suspicious activity
4. Update provider-side credentials

## Multi-Provider Support

Different providers require different credential formats:

### Platts

```json
{
  "credentials": {
    "apiKey": "platts_key",
    "apiSecret": "platts_secret"
  }
}
```

### OANDA

```json
{
  "credentials": {
    "accountId": "001-123-456",
    "apiToken": "abc123xyz"
  }
}
```

### Argus

```json
{
  "credentials": {
    "username": "user@company.com",
    "password": "secure_password",
    "clientId": "argus_client_123"
  }
}
```

### Custom Provider

```json
{
  "credentials": {
    "bearerToken": "Bearer eyJhbGc...",
    "refreshToken": "refresh_abc123"
  }
}
```

**The credential format is flexible** - store whatever fields the provider requires.

## Testing

### Unit Tests

```typescript
import { encryptEnvelope, decryptEnvelope } from '@/lib/crypto/encryption';

it('encrypts and decrypts credentials', () => {
  const credentials = { apiKey: 'test_key' };
  const plaintext = JSON.stringify(credentials);

  const envelope = encryptEnvelope(plaintext);
  const decrypted = decryptEnvelope(envelope);

  expect(JSON.parse(decrypted)).toEqual(credentials);
});
```

### Integration Tests

```typescript
// Create credential
const response = await fetch('/api/provider-credentials', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'TEST',
    name: 'Test Credential',
    credentials: { apiKey: 'test' },
  }),
});

expect(response.status).toBe(201);

const credential = await response.json();

// Verify secrets are NOT in response
expect(credential).not.toHaveProperty('credentials');
expect(credential).not.toHaveProperty('encryptedData');
```

## Security Checklist

- [ ] Master encryption key configured in environment
- [ ] Master key is base64-encoded 256-bit value
- [ ] Master key is different per environment
- [ ] Master key is stored securely (KMS, secrets manager)
- [ ] Master key is never committed to version control
- [ ] API endpoints require OWNER role
- [ ] API responses never include plaintext credentials
- [ ] API responses never include encryptedData
- [ ] Credentials are only decrypted for internal use
- [ ] Decrypted credentials are never logged
- [ ] Decrypted credentials are not included in error messages
- [ ] Usage tracking is enabled (lastUsedAt)
- [ ] Rotation policy is defined
- [ ] Expired credentials are handled properly
- [ ] Audit logs capture credential operations

## Troubleshooting

### Master key not configured

**Error:** `ENCRYPTION_MASTER_KEY not configured`

**Solution:** Set environment variable:
```bash
export ENCRYPTION_MASTER_KEY="your-base64-encoded-key"
```

### Credential expired

**Error:** `Credential "X" for provider "Y" has expired`

**Solution:**
1. Update expiresAt via PATCH endpoint
2. Or rotate credential with new expiration

### Decryption failed

**Error:** `Unsupported envelope version` or authentication errors

**Solution:**
- Verify master key is correct
- Check if encryptedData was tampered with
- Ensure envelope version is supported (currently v1)

### Permission denied

**Error:** 403 Forbidden

**Solution:** Only OWNER role can manage credentials. Check user's role.

## Related Documentation

- [Authorization](./authorization.md) - Role-based access control
- [Audit Logs](./audit-logs.md) - Tracking credential operations
- [Data Ingestion](./data-ingestion.md) - Using credentials for provider APIs

## Future Enhancements

- Automatic rotation reminders
- Integration with AWS KMS / GCP KMS
- Support for OAuth2 flows
- Credential versioning (keep old versions for rollback)
- Role-based credential access (separate read/write permissions)
- Credential sharing across tenants (with approval)
