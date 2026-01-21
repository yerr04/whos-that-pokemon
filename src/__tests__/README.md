# Testing Guide for Authentication Flow

This directory contains comprehensive tests for the authentication and redirect functionality.

## Setup

First, install the testing dependencies:

```bash
npm install
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Files

### `proxy.test.ts`
Tests the middleware proxy function that handles route protection and redirects.

**What it tests:**
- OAuth callback route exclusion
- Protected route access control
- Authenticated user redirects
- Cookie detection logic
- Edge cases (empty paths, nested paths, etc.)

### `auth/callback.test.ts`
Tests the OAuth callback route handler.

**What it tests:**
- Successful OAuth code exchange
- Error handling for invalid codes
- Redirect destination handling
- Network error scenarios

### `auth/sign-in.test.tsx`
Tests the sign-in page component.

**What it tests:**
- Redirect logic for authenticated users
- `redirectTo` parameter handling
- Session management
- SearchParams compatibility (Next.js 14 and 15)

### `auth/integration.test.ts`
Integration tests for the complete authentication flow.

**What it tests:**
- End-to-end OAuth sign-in flow
- Redirect loop prevention
- Multiple authentication attempts
- Logout flow

## Writing New Tests

### Testing Middleware (Proxy)

```typescript
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'

describe('My Feature', () => {
  it('should handle my scenario', () => {
    const request = createMockRequest('/my-path', { cookie: 'value' })
    const response = proxy(request)
    expect(response.type).toBe('next')
  })
})
```

### Testing Route Handlers

```typescript
import { GET } from '../app/my-route/route'

describe('My Route', () => {
  it('should handle request', async () => {
    const request = new NextRequest('https://example.com/my-route')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
```

### Testing Server Components

Server components can be tested by checking their redirect behavior:

```typescript
import { redirect } from 'next/navigation'
import MyPage from '../app/my-page/page'

it('should redirect when condition met', async () => {
  try {
    await MyPage({ searchParams: {} })
  } catch (error: any) {
    expect(error.message).toContain('NEXT_REDIRECT:/destination')
  }
})
```

## Mocking

### Supabase Client
Supabase clients are automatically mocked in `jest.setup.js`. You can override mocks in individual tests:

```typescript
const { createClient } = require('@/utils/supabase/client')
const mockSupabase = {
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
  },
}
createClient.mockReturnValue(mockSupabase)
```

### Next.js Navigation
Navigation functions are mocked in `jest.setup.js`. The `redirect` function throws a special error that can be caught:

```typescript
try {
  await MyPage({})
} catch (error: any) {
  if (error.message.includes('NEXT_REDIRECT')) {
    // Handle redirect
  }
}
```

## Best Practices

1. **Test one thing at a time** - Each test should verify a single behavior
2. **Use descriptive test names** - "should redirect authenticated users from sign-in to profile"
3. **Mock external dependencies** - Supabase, Next.js internals, etc.
4. **Test edge cases** - Invalid inputs, missing parameters, error states
5. **Keep tests isolated** - Each test should be independent and not rely on others

## Debugging Tests

If a test is failing:

1. Run the specific test file: `npm test -- proxy.test.ts`
2. Use `console.log` to inspect values (remove before committing)
3. Check that mocks are set up correctly
4. Verify environment variables are set for tests that need them
5. Ensure `jest.setup.js` is loading properly

## Coverage Goals

Aim for:
- 80%+ code coverage for critical paths (authentication, redirects)
- 100% coverage for security-sensitive code (route protection)
- Test all error paths and edge cases
