# Error Handling

The SDK provides a comprehensive error handling system that helps you handle different types of errors gracefully and get meaningful error information for debugging.

## Error Types

The SDK defines several specific error types that inherit from a base [`UiPathError`](/uipath-typescript/api/classes/UiPathError) class:

### [`AuthenticationError`](/uipath-typescript/api/classes/AuthenticationError)
Thrown when authentication fails (401 status codes).

**Common scenarios:**
- Invalid credentials
- Expired token
- Missing authentication

```typescript
import { UiPath, AuthenticationError, isAuthenticationError } from '@uipath/uipath-typescript/core';

const sdk = new UiPath(config);

try {
  await sdk.initialize();
} catch (error) {
  if (isAuthenticationError(error)) {
    console.log('Authentication failed:', error.message);
    // Handle re-authentication
  }
}
```

### [`AuthorizationError`](/uipath-typescript/api/classes/AuthorizationError)
Thrown when access is denied (403 status codes).

**Common scenarios:**
- Insufficient permissions
- Access denied to specific folder
- Scope limitations

```typescript
import { UiPath, AuthorizationError, isAuthorizationError } from '@uipath/uipath-typescript/core';
import { Assets } from '@uipath/uipath-typescript/assets';

const sdk = new UiPath(config);
await sdk.initialize();
const assets = new Assets(sdk);

try {
  const folderAssets = await assets.getAll({ folderId: 12345 });
} catch (error) {
  if (isAuthorizationError(error)) {
    console.log('Access denied:', error.message);
    // Handle permission error
  }
}
```

### [`ValidationError`](/uipath-typescript/api/classes/ValidationError)
Thrown when validation fails (400 status codes).

**Common scenarios:**
- Invalid input parameters
- Missing required fields
- Invalid data format

```typescript
import { UiPath, ValidationError, isValidationError } from '@uipath/uipath-typescript/core';
import { Processes } from '@uipath/uipath-typescript/processes';

const sdk = new UiPath(config);
await sdk.initialize();
const processes = new Processes(sdk);

try {
  await processes.start({
    releaseKey: 'invalid-key'
  }, folderId);
} catch (error) {
  if (isValidationError(error)) {
    console.log('Validation failed:', error.message);
    // Handle validation errors
  }
}
```

### [`NotFoundError`](/uipath-typescript/api/classes/NotFoundError)
Thrown when requested resources are not found (404 status codes).

**Common scenarios:**
- Resource doesn't exist
- Folder not found
- Process not found

```typescript
import { UiPath, NotFoundError, isNotFoundError } from '@uipath/uipath-typescript/core';
import { Assets } from '@uipath/uipath-typescript/assets';

const sdk = new UiPath(config);
await sdk.initialize();
const assets = new Assets(sdk);

try {
  const asset = await assets.getById(99999, folderId);
} catch (error) {
  if (isNotFoundError(error)) {
    console.log('Asset not found:', error.message);
    // Handle missing resource
  }
}
```

### [`RateLimitError`](/uipath-typescript/api/classes/RateLimitError)
Thrown when rate limits are exceeded (429 status codes).

**Common scenarios:**
- Too many requests
- API rate limiting

```typescript
import { UiPath, RateLimitError, isRateLimitError } from '@uipath/uipath-typescript/core';
import { Assets } from '@uipath/uipath-typescript/assets';

const sdk = new UiPath(config);
await sdk.initialize();
const assets = new Assets(sdk);

try {
  await assets.getAll();
} catch (error) {
  if (isRateLimitError(error)) {
    console.log('Rate limit exceeded:', error.message);
    // Implement retry logic with backoff
  }
}
```

### [`ServerError`](/uipath-typescript/api/classes/ServerError)
Thrown when server errors occur (5xx status codes).

**Common scenarios:**
- Internal server error
- Service unavailable
- Gateway timeout

```typescript
import { UiPath, ServerError, isServerError } from '@uipath/uipath-typescript/core';
import { Queues } from '@uipath/uipath-typescript/queues';

const sdk = new UiPath(config);
await sdk.initialize();
const queues = new Queues(sdk);

try {
  await queues.getAll();
} catch (error) {
  if (isServerError(error)) {
    console.log('Server error:', error.message);
    // Handle server-side errors
  }
}
```

### [`NetworkError`](/uipath-typescript/api/classes/NetworkError)
Thrown when network-related errors occur.

**Common scenarios:**
- Connection timeout
- Request aborted
- DNS resolution failure
- Network connectivity issues

```typescript
import { UiPath, NetworkError, isNetworkError } from '@uipath/uipath-typescript/core';
import { Processes } from '@uipath/uipath-typescript/processes';

const sdk = new UiPath(config);
await sdk.initialize();
const processes = new Processes(sdk);

try {
  await processes.getAll();
} catch (error) {
  if (isNetworkError(error)) {
    console.log('Network error:', error.message);
    // Handle network issues
  }
}
```

## Error Information

### Getting Error Details
```typescript
import { UiPath, getErrorDetails } from '@uipath/uipath-typescript/core';
import { Assets } from '@uipath/uipath-typescript/assets';

const sdk = new UiPath(config);
await sdk.initialize();
const assets = new Assets(sdk);

try {
  await assets.getAll();
} catch (error) {
  const details = getErrorDetails(error);
  console.log('Error message:', details.message);
  console.log('Status code:', details.statusCode);
}
```

### Accessing All Error Properties
```typescript
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core';
import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';

const sdk = new UiPath(config);
await sdk.initialize();
const maestroProcesses = new MaestroProcesses(sdk);

try {
  const allProcesses = await maestroProcesses.getAll();
} catch (error) {
  if (error instanceof UiPathError) {
    // Access common error properties
    console.log('Error Type:', error.type);
    console.log('Message:', error.message);
    console.log('Status Code:', error.statusCode);
    console.log('Request ID:', error.requestId);
    console.log('Timestamp:', error.timestamp);
    console.log('error stack trace:', error.stack);

    // Get detailed debug information including stack trace
    const debugInfo = error.getDebugInfo();
  }
}
```

### Debug Information
```typescript
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core';
import { Processes } from '@uipath/uipath-typescript/processes';

const sdk = new UiPath(config);
await sdk.initialize();
const processes = new Processes(sdk);

try {
  await processes.start({ releaseKey: 'test' }, folderId);
} catch (error) {
  if (error instanceof UiPathError) {
    const debugInfo = error.getDebugInfo();
    console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
  }
}
```