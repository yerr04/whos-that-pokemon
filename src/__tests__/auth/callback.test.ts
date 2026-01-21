/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '../../app/auth/callback/route'

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
    set: jest.fn(),
  })),
}))

// Mock Supabase SSR
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      exchangeCodeForSession: jest.fn(),
    },
  })),
}))

// Mock NextResponse
const mockRedirect = jest.fn()
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      redirect: (url: URL) => {
        mockRedirect(url.toString())
        return { url: url.toString(), status: 307 }
      },
    },
  }
})

describe('OAuth Callback Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'
  })

  function createMockRequest(code: string | null, next: string = '/') {
    const searchParams = new URLSearchParams()
    if (code) searchParams.set('code', code)
    if (next) searchParams.set('next', next)

    const url = `https://example.com/auth/callback?${searchParams.toString()}`
    return new NextRequest(url)
  }

  describe('Successful OAuth Flow', () => {
    it('should redirect to next parameter after successful code exchange', async () => {
      const { createServerClient } = require('@supabase/ssr')
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
        },
      }
      createServerClient.mockReturnValue(mockSupabase)

      const request = createMockRequest('test-code', '/profile')
      await GET(request)

      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('test-code')
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining('/profile')
      )
    })

    it('should default to / when no next parameter', async () => {
      const { createServerClient } = require('@supabase/ssr')
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
        },
      }
      createServerClient.mockReturnValue(mockSupabase)

      const request = createMockRequest('test-code', '')
      await GET(request)

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining('https://example.com/')
      )
    })

    it('should handle callback without code parameter', async () => {
      const { createServerClient } = require('@supabase/ssr')
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: jest.fn(),
        },
      }
      createServerClient.mockReturnValue(mockSupabase)

      const request = createMockRequest(null, '/profile')
      await GET(request)

      // Should not call exchangeCodeForSession when no code
      expect(mockSupabase.auth.exchangeCodeForSession).not.toHaveBeenCalled()
      // Should still redirect to next
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining('/profile')
      )
    })
  })

  describe('Error Handling', () => {
    it('should redirect to error page on exchange failure', async () => {
      const { createServerClient } = require('@supabase/ssr')
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: jest.fn().mockResolvedValue({
            error: new Error('Invalid code'),
          }),
        },
      }
      createServerClient.mockReturnValue(mockSupabase)

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = createMockRequest('invalid-code', '/profile')
      await GET(request)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'OAuth callback error:',
        expect.any(Error)
      )
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error')
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle network errors gracefully', async () => {
      const { createServerClient } = require('@supabase/ssr')
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: jest.fn().mockRejectedValue(
            new Error('Network error')
          ),
        },
      }
      createServerClient.mockReturnValue(mockSupabase)

      const request = createMockRequest('test-code', '/profile')

      await expect(GET(request)).rejects.toThrow('Network error')
    })
  })

  describe('Redirect Destinations', () => {
    it('should preserve full URL structure in redirect', async () => {
      const { createServerClient } = require('@supabase/ssr')
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
        },
      }
      createServerClient.mockReturnValue(mockSupabase)

      const request = createMockRequest('test-code', '/profile?tab=settings')
      await GET(request)

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining('/profile?tab=settings')
      )
    })

    it('should handle relative and absolute paths correctly', async () => {
      const { createServerClient } = require('@supabase/ssr')
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
        },
      }
      createServerClient.mockReturnValue(mockSupabase)

      const request = createMockRequest('test-code', '/daily')
      await GET(request)

      const redirectUrl = mockRedirect.mock.calls[0][0]
      expect(redirectUrl).toContain('/daily')
      expect(redirectUrl).toMatch(/^https:\/\//)
    })
  })
})
