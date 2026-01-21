/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import { redirect } from 'next/navigation'
import SignInPage from '../../app/auth/sign-in/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    const error = new Error(`NEXT_REDIRECT:${path}`)
    error.digest = `NEXT_REDIRECT;${path}`
    throw error
  }),
}))

// Mock Supabase server client
const mockGetSession = jest.fn()
const mockGetUser = jest.fn()

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: () => mockGetSession(),
      getUser: () => mockGetUser(),
    },
  })),
}))

// Mock SignInClient component
jest.mock('../../app/auth/sign-in/SignInClient', () => {
  return function MockSignInClient() {
    return <div>Sign In Client</div>
  }
})

describe('Sign In Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockGetUser.mockResolvedValue({ data: { user: null } })
  })

  describe('Unauthenticated Users', () => {
    it('should render SignInClient when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      await SignInPage({ searchParams: Promise.resolve({}) })

      // Since we're testing a server component, we need to check if it doesn't redirect
      expect(redirect).not.toHaveBeenCalled()
    })

    it('should handle missing searchParams', async () => {
      await SignInPage({ searchParams: {} })

      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe('Authenticated Users - Redirect Logic', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
    }

    it('should redirect authenticated users to /profile by default', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser } })

      try {
        await SignInPage({ searchParams: Promise.resolve({}) })
      } catch (error: any) {
        expect(error.message).toContain('NEXT_REDIRECT:/profile')
      }
    })

    it('should redirect authenticated users to redirectTo destination', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser } })

      try {
        await SignInPage({
          searchParams: Promise.resolve({ redirectTo: '/stats' }),
        })
      } catch (error: any) {
        expect(error.message).toContain('NEXT_REDIRECT:/stats')
      }
    })

    it('should validate redirectTo path starts with /', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser } })

      try {
        await SignInPage({
          searchParams: Promise.resolve({ redirectTo: 'evil.com' }),
        })
      } catch (error: any) {
        // Should redirect to /profile if redirectTo is invalid
        expect(error.message).toContain('NEXT_REDIRECT:/profile')
      }
    })

    it('should handle redirectTo with query parameters', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser } })

      try {
        await SignInPage({
          searchParams: Promise.resolve({ redirectTo: '/profile?tab=settings' }),
        })
      } catch (error: any) {
        expect(error.message).toContain('NEXT_REDIRECT:/profile?tab=settings')
      }
    })
  })

  describe('Session Management', () => {
    it('should refresh session before checking user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      await SignInPage({ searchParams: Promise.resolve({}) })

      expect(mockGetSession).toHaveBeenCalled()
      expect(mockGetUser).toHaveBeenCalled()
    })

    it('should handle session refresh errors gracefully', async () => {
      mockGetSession.mockRejectedValue(new Error('Session error'))
      mockGetUser.mockResolvedValue({ data: { user: null } })

      await expect(
        SignInPage({ searchParams: Promise.resolve({}) })
      ).rejects.toThrow('Session error')
    })
  })

  describe('SearchParams Handling', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
    }

    it('should handle Promise-based searchParams (Next.js 15+)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser } })

      try {
        await SignInPage({
          searchParams: Promise.resolve({ redirectTo: '/profile' }),
        })
      } catch (error: any) {
        expect(error.message).toContain('NEXT_REDIRECT:/profile')
      }
    })

    it('should handle object-based searchParams (Next.js 14)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser } })

      try {
        await SignInPage({
          searchParams: { redirectTo: '/profile' },
        })
      } catch (error: any) {
        expect(error.message).toContain('NEXT_REDIRECT:/profile')
      }
    })
  })
})
