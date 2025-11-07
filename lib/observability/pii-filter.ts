/**
 * PII Filtering
 *
 * Filter personally identifiable information from logs and traces.
 */

export interface PIIFilterOptions {
  maskEmail?: boolean;
  maskPhone?: boolean;
  maskSSN?: boolean;
  maskCreditCard?: boolean;
  customPatterns?: Array<{ pattern: RegExp; replacement: string }>;
}

const DEFAULT_OPTIONS: PIIFilterOptions = {
  maskEmail: true,
  maskPhone: true,
  maskSSN: true,
  maskCreditCard: true,
};

// PII patterns
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_PATTERN = /\b(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_PATTERN = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;

// Sensitive field names (case-insensitive)
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'privatekey',
  'private_key',
  'ssn',
  'social_security',
  'creditcard',
  'credit_card',
  'cvv',
  'pin',
];

/**
 * Filter PII from string
 */
export function filterPII(
  input: string,
  options: PIIFilterOptions = DEFAULT_OPTIONS
): string {
  let filtered = input;

  if (options.maskEmail) {
    filtered = filtered.replace(EMAIL_PATTERN, (email) => {
      const [local, domain] = email.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    });
  }

  if (options.maskPhone) {
    filtered = filtered.replace(PHONE_PATTERN, '***-***-****');
  }

  if (options.maskSSN) {
    filtered = filtered.replace(SSN_PATTERN, '***-**-****');
  }

  if (options.maskCreditCard) {
    filtered = filtered.replace(CREDIT_CARD_PATTERN, (card) => {
      const digits = card.replace(/[-\s]/g, '');
      return `****-****-****-${digits.slice(-4)}`;
    });
  }

  // Custom patterns
  if (options.customPatterns) {
    for (const { pattern, replacement } of options.customPatterns) {
      filtered = filtered.replace(pattern, replacement);
    }
  }

  return filtered;
}

/**
 * Filter PII from object (recursive)
 */
export function filterPIIFromObject<T>(
  obj: T,
  options: PIIFilterOptions = DEFAULT_OPTIONS
): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return filterPII(obj, options) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => filterPIIFromObject(item, options)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const filtered: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Check if field name is sensitive
      if (isSensitiveField(key)) {
        filtered[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        filtered[key] = filterPII(value, options);
      } else if (typeof value === 'object') {
        filtered[key] = filterPIIFromObject(value, options);
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  return obj;
}

/**
 * Check if field name is sensitive
 */
function isSensitiveField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[_-]/g, '');
  return SENSITIVE_FIELDS.some((sensitive) =>
    normalized.includes(sensitive.replace(/[_-]/g, ''))
  );
}

/**
 * Create safe log message
 */
export function createSafeLogMessage(
  message: string,
  metadata?: Record<string, any>,
  options?: PIIFilterOptions
): {
  message: string;
  metadata?: Record<string, any>;
} {
  return {
    message: filterPII(message, options),
    ...(metadata && {
      metadata: filterPIIFromObject(metadata, options),
    }),
  };
}

/**
 * Safe console.log wrapper
 */
export function safeLog(
  message: string,
  metadata?: Record<string, any>,
  options?: PIIFilterOptions
): void {
  const safe = createSafeLogMessage(message, metadata, options);
  if (safe.metadata) {
    console.log(safe.message, safe.metadata);
  } else {
    console.log(safe.message);
  }
}

/**
 * Safe console.error wrapper
 */
export function safeError(
  message: string,
  error?: Error,
  metadata?: Record<string, any>,
  options?: PIIFilterOptions
): void {
  const safe = createSafeLogMessage(message, metadata, options);

  if (error) {
    const safeError = new Error(filterPII(error.message, options));
    safeError.stack = error.stack ? filterPII(error.stack, options) : undefined;

    if (safe.metadata) {
      console.error(safe.message, safeError, safe.metadata);
    } else {
      console.error(safe.message, safeError);
    }
  } else {
    if (safe.metadata) {
      console.error(safe.message, safe.metadata);
    } else {
      console.error(safe.message);
    }
  }
}

/**
 * Sanitize span attributes for tracing
 */
export function sanitizeSpanAttributes(
  attributes: Record<string, any>,
  options?: PIIFilterOptions
): Record<string, any> {
  return filterPIIFromObject(attributes, options);
}

/**
 * Check if string contains PII
 */
export function containsPII(input: string): boolean {
  return (
    EMAIL_PATTERN.test(input) ||
    PHONE_PATTERN.test(input) ||
    SSN_PATTERN.test(input) ||
    CREDIT_CARD_PATTERN.test(input)
  );
}
