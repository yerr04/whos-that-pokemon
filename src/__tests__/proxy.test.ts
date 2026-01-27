import { NextRequest } from 'next/server'
import { handleRouteProtection as proxy } from '../middleware'

// Mock NextResponse
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return {
    ...actual,
    NextResponse: {
      next: jest.fn(() => ({ type: 'next' })),
      redirect: jest.fn((url) => ({
        type: 'redirect',
        url: url.toString(),
      })),
    },
  }
})

// Set environment variable for cookie detection
const originalEnv = process.env

describe('Proxy Middleware', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function createMockRequest(pathname: string, cookies: Record<string, string> = {}) {
    const url = `https://example.com${pathname}`
    const request = new NextRequest(url)
    
    // Mock cookies
    Object.entries(cookies).forEach(([name, value]) => {
      request.cookies.set(name, value)
    })

    return request
  }

  describe('OAuth Callback Route Exclusion', () => {
    it('should skip middleware for /auth/callback routes', () => {
      const request = createMockRequest('/auth/callback?code=123')
      const response = proxy(request)

      expect(response.type).toBe('next')
    })

    it('should skip middleware for /auth/callback with next parameter', () => {
      const request = createMockRequest('/auth/callback?code=123&next=/profile')
      const response = proxy(request)

      expect(response.type).toBe('next')
    })
  })

  describe('Protected Routes (Unauthenticated)', () => {
    it('should redirect unauthenticated users from /profile to /auth/sign-in', () => {
      const request = createMockRequest('/profile')
      const response = proxy(request)

      expect(response.type).toBe('redirect')
      expect(response.url).toContain('/auth/sign-in')
      expect(response.url).toContain('redirectTo=/profile')
    })

    it('should redirect unauthenticated users from /stats to /auth/sign-in', () => {
      const request = createMockRequest('/stats')
      const response = proxy(request)

      expect(response.type).toBe('redirect')
      expect(response.url).toContain('/auth/sign-in')
      expect(response.url).toContain('redirectTo=/stats')
    })

    it('should preserve query parameters in redirectTo', () => {
      const request = createMockRequest('/profile?tab=settings')
      const response = proxy(request)

      expect(response.type).toBe('redirect')
      expect(response.url).toContain('redirectTo=/profile?tab=settings')
    })

    it('should not redirect public routes when unauthenticated', () => {
      const request = createMockRequest('/')
      const response = proxy(request)

      expect(response.type).toBe('next')
    })

    it('should not redirect /daily route when unauthenticated', () => {
      const request = createMockRequest('/daily')
      const response = proxy(request)

      expect(response.type).toBe('next')
    })
  })

  describe('Authenticated Users', () => {
    const authCookies = {
      'sb-test-project-auth-token': 'test-token',
    }

    it('should allow access to protected routes when authenticated', () => {
      const request = createMockRequest('/profile', authCookies)
      const response = proxy(request)

      expect(response.type).toBe('next')
    })

    it('should redirect authenticated users from /auth/sign-in to home when no redirectTo', () => {
      const request = createMockRequest('/auth/sign-in', authCookies)
      const response = proxy(request)

      expect(response.type).toBe('redirect')
      expect(response.url).toContain('/')
      expect(response.url).not.toContain('redirectTo')
    })

    it('should redirect authenticated users from /auth/sign-in to redirectTo destination', () => {
      const request = createMockRequest('/auth/sign-in?redirectTo=/profile', authCookies)
      const response = proxy(request)

      expect(response.type).toBe('redirect')
      expect(response.url).toContain('/profile')
      expect(response.url).not.toContain('redirectTo')
    })

    it('should validate redirectTo path starts with /', () => {
      const request = createMockRequest('/auth/sign-in?redirectTo=evil.com', authCookies)
      const response = proxy(request)

      // Should redirect to home if redirectTo is invalid
      expect(response.type).toBe('redirect')
      expect(response.url).toContain('/')
    })
  })

  describe('Cookie Detection', () => {
    it('should detect Supabase auth cookie', () => {
      const request = createMockRequest('/profile', {
        'sb-test-project-auth-token': 'test-token',
      })
      const response = proxy(request)

      expect(response.type).toBe('next')
    })

    it('should detect fallback access token cookie', () => {
      const request = createMockRequest('/profile', {
        'sb-access-token': 'test-token',
      })
      const response = proxy(request)

      expect(response.type).toBe('next')
    })

    it('should detect fallback refresh token cookie', () => {
      const request = createMockRequest('/profile', {
        'sb-refresh-token': 'test-token',
      })
      const response = proxy(request)

      expect(response.type).toBe('next')
    })

    it('should not authenticate with unrelated cookies', () => {
      const request = createMockRequest('/profile', {
        'other-cookie': 'test-value',
      })
      const response = proxy(request)

      expect(response.type).toBe('redirect')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty pathname', () => {
      const request = createMockRequest('')
      const response = proxy(request)

      expect(response.type).toBe('next')
    })

    it('should handle paths with multiple slashes', () => {
      const request = createMockRequest('/profile//settings')
      const response = proxy(request)

      expect(response.type).toBe('redirect')
      expect(response.url).toContain('/auth/sign-in')
    })

    it('should handle nested protected paths', () => {
      const request = createMockRequest('/profile/settings')
      const response = proxy(request)

      expect(response.type).toBe('redirect')
      expect(response.url).toContain('redirectTo=/profile/settings')
    })
  })
})
