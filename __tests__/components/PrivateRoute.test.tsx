import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import PrivateRoute from '@/components/PrivateRoute'
import { setupAuthenticatedUser } from '../utils/test-utils'

// Mock the router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('PrivateRoute Component', () => {
  beforeEach(() => {
    mockPush.mockClear()
    jest.clearAllMocks()
  })

  describe('Authentication Check', () => {
    it('renders children when user is authenticated', () => {
      localStorage.setItem('auth', 'true')
      localStorage.setItem('userData', JSON.stringify({ id: 1, nome: 'Test User' }))
      
      render(
        <PrivateRoute>
          <div data-testid="protected-content">Protected Content</div>
        </PrivateRoute>
      )
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('redirects to login when user is not authenticated', () => {
      localStorage.removeItem('auth')
      localStorage.removeItem('userData')
      
      render(
        <PrivateRoute>
          <div data-testid="protected-content">Protected Content</div>
        </PrivateRoute>
      )
      
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('redirects to login when auth is false', () => {
      localStorage.setItem('auth', 'false')
      
      render(
        <PrivateRoute>
          <div data-testid="protected-content">Protected Content</div>
        </PrivateRoute>
      )
      
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('redirects to login when auth is missing', () => {
      localStorage.removeItem('auth')
      
      render(
        <PrivateRoute>
          <div data-testid="protected-content">Protected Content</div>
        </PrivateRoute>
      )
      
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  describe('Children Rendering', () => {
    it('renders multiple children when authenticated', () => {
      localStorage.setItem('auth', 'true')
      
      render(
        <PrivateRoute>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <span data-testid="child-3">Child 3</span>
        </PrivateRoute>
      )
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
      expect(screen.getByTestId('child-3')).toBeInTheDocument()
    })

    it('renders complex JSX children when authenticated', () => {
      localStorage.setItem('auth', 'true')
      
      const ComplexChild = () => (
        <div data-testid="complex-child">
          <h1>Title</h1>
          <p>Paragraph</p>
          <button>Button</button>
        </div>
      )
      
      render(
        <PrivateRoute>
          <ComplexChild />
        </PrivateRoute>
      )
      
      expect(screen.getByTestId('complex-child')).toBeInTheDocument()
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Paragraph')).toBeInTheDocument()
      expect(screen.getByText('Button')).toBeInTheDocument()
    })
    it('still renders children while redirecting (before effect runs)', () => {
      localStorage.removeItem('auth')
      localStorage.removeItem('userData')
      
      render(
        <PrivateRoute>
          <div data-testid="protected-content">Protected Content</div>
        </PrivateRoute>
      )
      
      // Children should still be rendered since useEffect runs after render
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      localStorage.setItem('auth', 'true')
      
      render(<PrivateRoute>{null}</PrivateRoute>)
      
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('handles undefined children', () => {
      localStorage.setItem('auth', 'true')
      
      render(<PrivateRoute>{undefined}</PrivateRoute>)
      
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('handles string children', () => {
      localStorage.setItem('auth', 'true')
      
      render(<PrivateRoute>Plain text content</PrivateRoute>)
      
      expect(screen.getByText('Plain text content')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('handles number children', () => {
      localStorage.setItem('auth', 'true')
      
      render(<PrivateRoute>{12345}</PrivateRoute>)
      
      expect(screen.getByText('12345')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('LocalStorage Edge Cases', () => {
    it('handles localStorage errors gracefully', () => {
      // Mock localStorage to throw an error by overriding the method
      const originalGetItem = Object.getOwnPropertyDescriptor(window.Storage.prototype, 'getItem')!
      Object.defineProperty(window.Storage.prototype, 'getItem', {
        value: jest.fn(() => {
          throw new Error('localStorage error')
        })
      })
      
      render(
        <PrivateRoute>
          <div data-testid="protected-content">Protected Content</div>
        </PrivateRoute>
      )
      
      // Should redirect on error (since it can't verify auth)
      expect(mockPush).toHaveBeenCalledWith('/login')
      
      // Restore original localStorage
      Object.defineProperty(window.Storage.prototype, 'getItem', originalGetItem)
    })

    it('handles malformed auth values', () => {
      localStorage.setItem('auth', 'invalid-json')
      
      render(
        <PrivateRoute>
          <div data-testid="protected-content">Protected Content</div>
        </PrivateRoute>
      )
      
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('handles auth value with extra whitespace', () => {
      localStorage.setItem('auth', ' true ')
      
      render(
        <PrivateRoute>
          <div data-testid="protected-content">Protected Content</div>
        </PrivateRoute>
      )
      
      // Should redirect since ' true ' !== 'true'
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})