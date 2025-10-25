# Logging Guide

**Templar Archives Structured Logging System**

---

## Overview

Templar Archives uses **Pino** for structured, production-ready logging.

### Features

- ✅ **Structured JSON logs** in production
- ✅ **Pretty printing** in development
- ✅ **Multiple log levels** (trace, debug, info, warn, error, fatal)
- ✅ **Context enrichment** (request ID, user ID, etc.)
- ✅ **Type-safe** logging API
- ✅ **Child loggers** for request scoping

---

## Installation

```bash
npm install pino pino-pretty
```

Already installed in this project.

---

## Basic Usage

### Import Logger

```typescript
import { logger } from '@/lib/logger'
```

### Log Levels

```typescript
// Trace (most verbose, development only)
logger.trace('Function called', { functionName: 'getUserById', userId: '123' })

// Debug (development only)
logger.debug('Cache hit', { key: 'user:123', ttl: 3600 })

// Info (default)
logger.info('User logged in', { userId: '123', email: 'user@example.com' })

// Warning
logger.warn('Deprecated API used', { endpoint: '/api/old-endpoint' })

// Error
logger.error('Database query failed', {
  error: new Error('Connection timeout'),
  query: 'SELECT * FROM users',
  duration: 5000
})

// Fatal (highest severity, application crash)
logger.fatal('Critical system failure', { error: err })
```

---

## Advanced Usage

### With Context

Always provide context for better debugging:

```typescript
logger.info('User created', {
  userId: newUser.id,
  email: newUser.email,
  role: newUser.role,
  timestamp: Date.now()
})
```

### Error Logging

```typescript
try {
  await riskyOperation()
} catch (error) {
  logger.error('Operation failed', {
    error, // Logger will extract name, message, stack
    userId: user.id,
    operation: 'createPost'
  })
}
```

### Child Loggers

Create request-scoped loggers with default context:

```typescript
export async function POST(request: NextRequest) {
  const requestLogger = logger.child({
    requestId: generateRequestId(),
    method: request.method,
    endpoint: request.url
  })

  requestLogger.info('Request started')

  try {
    // ... handle request
    requestLogger.info('Request completed', { statusCode: 200 })
  } catch (error) {
    requestLogger.error('Request failed', { error })
  }
}
```

### HTTP Request Logging

```typescript
import { logger } from '@/lib/logger'

logger.logRequest(
  'POST',
  '/api/users',
  201,
  150, // duration in ms
  { userId: '123', requestId: 'req_abc' }
)

// Output: POST /api/users 201 - 150ms
```

### Database Query Logging

```typescript
const startTime = Date.now()
const result = await supabase.from('users').select('*')
const duration = Date.now() - startTime

logger.logQuery(
  'SELECT * FROM users WHERE id = $1',
  duration,
  { table: 'users', rowCount: result.data?.length }
)
```

### Security Event Logging

```typescript
logger.logSecurity(
  'sql_injection_attempt',
  'critical',
  {
    userId: user.id,
    ip: request.ip,
    payload: suspiciousInput
  }
)
```

### Performance Metrics

```typescript
logger.logMetric('api_response_time', 250, 'ms', {
  endpoint: '/api/users',
  method: 'GET'
})

logger.logMetric('database_query_size', 1024, 'bytes', {
  query: 'SELECT users with posts'
})

logger.logMetric('active_users', 1500, 'count')
```

---

## Request-Scoped Logging

### Helper Function

```typescript
import { createRequestLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const reqLogger = createRequestLogger(request)

  reqLogger.info('Processing webhook')

  // All logs will include requestId, method, endpoint, userAgent, ip
  reqLogger.debug('Parsing payload', { size: payload.length })
  reqLogger.info('Webhook processed successfully')
}
```

### Output (Development)

```
[INFO] Processing webhook
  requestId: "req_1729900000_abc123"
  method: "POST"
  endpoint: "/api/webhook"
  userAgent: "GitHub-Hookshot/abc"
  ip: "192.168.1.1"

[DEBUG] Parsing payload
  requestId: "req_1729900000_abc123"
  size: 1024

[INFO] Webhook processed successfully
  requestId: "req_1729900000_abc123"
```

### Output (Production)

```json
{
  "level": "info",
  "time": "2025-10-26T10:30:00.000Z",
  "msg": "Processing webhook",
  "requestId": "req_1729900000_abc123",
  "method": "POST",
  "endpoint": "/api/webhook",
  "userAgent": "GitHub-Hookshot/abc",
  "ip": "192.168.1.1",
  "env": "production",
  "service": "templar-archives"
}
```

---

## Log Levels

### When to Use Each Level

| Level | When to Use | Examples |
|-------|-------------|----------|
| **trace** | Function entry/exit, loop iterations | "Function called", "Processing item 10/100" |
| **debug** | Detailed debugging info | "Cache hit", "Query results", "Parsed config" |
| **info** | Normal application events | "User logged in", "Email sent", "Job completed" |
| **warn** | Potential issues, deprecations | "Slow query", "API deprecated", "Retrying request" |
| **error** | Errors that are handled | "Database error", "API failed", "Invalid input" |
| **fatal** | Critical errors, app crash | "Out of memory", "Database down", "Config missing" |

### Setting Log Level

```bash
# Environment variable
LOG_LEVEL=debug npm run dev

# Production (default: info)
LOG_LEVEL=warn npm start
```

---

## Migration from Old Logger

### Old Logger (lib/logger.ts.old)

```typescript
// OLD
logger.debug('Processing user', userId, { email })
logger.info('Request completed', statusCode)
logger.error('Failed:', error)
```

### New Logger

```typescript
// NEW (Structured)
logger.debug('Processing user', { userId, email })
logger.info('Request completed', { statusCode })
logger.error('Failed', { error })
```

### Backward Compatibility

Old logger methods still work via `legacyLogger`:

```typescript
import { legacyLogger } from '@/lib/logger'

legacyLogger.debug('Message', data1, data2) // Works but not recommended
```

**Recommendation**: Migrate to new structured logging for better log analysis.

---

## Production Setup

### Environment Variables

```bash
# .env.production
LOG_LEVEL=info  # info, warn, error, fatal
NODE_ENV=production
```

### Log Aggregation

#### Option 1: Vercel (Built-in)

Logs are automatically collected in Vercel dashboard.

#### Option 2: Datadog

```typescript
// lib/logger/index.ts
import { datadogLogger } from './datadog'

// Send logs to Datadog
if (appEnv.isProduction) {
  datadogLogger.sendLog(logData)
}
```

#### Option 3: CloudWatch

```typescript
// lib/logger/index.ts
import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs'

// Send to CloudWatch
cloudwatch.putLogEvents({
  logGroupName: '/templar-archives/production',
  logStreamName: 'api',
  logEvents: [logData]
})
```

#### Option 4: Custom SIEM

```typescript
// POST logs to custom endpoint
fetch('https://logs.company.com/ingest', {
  method: 'POST',
  body: JSON.stringify(logData)
})
```

---

## Best Practices

### ✅ DO

```typescript
// Include context
logger.info('User updated', {
  userId: user.id,
  changes: ['email', 'name'],
  timestamp: Date.now()
})

// Use child loggers for scoping
const apiLogger = logger.child({ service: 'api', version: 'v1' })

// Log errors with context
logger.error('Payment failed', {
  error,
  userId: user.id,
  amount: payment.amount,
  paymentMethod: payment.method
})
```

### ❌ DON'T

```typescript
// Don't use string concatenation
logger.info('User ' + userId + ' logged in') // ❌

// Don't log sensitive data
logger.info('Password reset', { password: newPassword }) // ❌

// Don't log in loops without throttling
for (const item of items) {
  logger.debug('Processing', item) // ❌ (use trace or batch)
}

// Don't ignore errors
try {
  await operation()
} catch (err) {
  // Silent failure ❌
}
```

---

## Security Logging

### Security Events

```typescript
import { logSecurityEvent } from '@/lib/monitoring/security-logger'

logSecurityEvent('sql_injection_attempt', {
  userId: user?.id,
  ip: request.ip,
  payload: request.body,
  endpoint: request.url
})
```

### Security Alerts

Critical events automatically create alerts:

```typescript
import { createSecurityAlert } from '@/lib/monitoring/security-logger'

createSecurityAlert('rls_bypass_attempt', {
  userId: user.id,
  table: 'sensitive_data',
  timestamp: Date.now()
})
```

---

## Performance

### Pino Performance

- **10x faster** than Winston
- **Minimal overhead** (~1-2ms per log)
- **Asynchronous I/O** (non-blocking)
- **Child logger caching**

### Benchmarks

```
pino: 50,000 logs in 150ms
winston: 50,000 logs in 1,500ms
console.log: 50,000 logs in 800ms
```

---

## Troubleshooting

### Logs Not Showing

**Development**:
```bash
# Check if pino-pretty is installed
npm list pino-pretty

# Check NODE_ENV
echo $NODE_ENV  # Should be 'development'
```

**Production**:
```bash
# Check log level
echo $LOG_LEVEL  # Should be 'info' or lower

# Check logs in Vercel dashboard
vercel logs
```

### Log Format Issues

If logs appear as raw JSON in development:

```bash
# Reinstall pino-pretty
npm install --save-dev pino-pretty

# Or run with pretty flag
NODE_ENV=development npm run dev
```

---

## Examples

### Complete API Route Example

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRequestLogger } from '@/lib/logger'
import { applyRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request)
  const startTime = Date.now()

  logger.info('API request started')

  try {
    // Rate limiting
    const rateLimitResponse = await applyRateLimit(request, rateLimiters.general)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded')
      return rateLimitResponse
    }

    // Parse body
    const body = await request.json()
    logger.debug('Request body parsed', { bodySize: JSON.stringify(body).length })

    // Process request
    const result = await processData(body)
    logger.info('Request processed successfully', { resultCount: result.length })

    // Log performance
    const duration = Date.now() - startTime
    logger.logMetric('api_response_time', duration, 'ms', {
      endpoint: request.url,
      statusCode: 200
    })

    return NextResponse.json(result)

  } catch (error) {
    logger.error('API request failed', {
      error,
      duration: Date.now() - startTime
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Resources

- **Pino Documentation**: https://getpino.io/
- **Pino Best Practices**: https://getpino.io/#/docs/best-practices
- **Pino Transports**: https://getpino.io/#/docs/transports

---

**Last Updated**: 2025-10-26
**Maintainer**: Templar Archives Team
