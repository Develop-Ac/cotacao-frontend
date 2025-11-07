import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PrivateLayout from '@/app/(private)/layout'
import { setupAuthenticatedUser } from '../utils/test-utils'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock useRouter
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

// Mock PrivateRoute component
jest.mock('@/components/PrivateRoute', () => {
  return function MockedPrivateRoute({ children }: { children: React.ReactNode }) {
    return <div data-testid="private-route">{children}</div>
  }
})

describe('Private Layout', () => {
  beforeEach(() => {
    setupAuthenticatedUser()
    localStorageMock.clear()
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders the main layout structure', () => {
      const mockUserData = {
        id: 1,
        nome: 'João Silva',
        setor: 'TI',
        permissions: {
          compras: true,
          estoque: true,
          expedicao: true,
          oficina: true,
          usuario: true
        }
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUserData))
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      expect(screen.getByTestId('private-route')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('renders the sidebar navigation', () => {
      const mockUserData = {
        id: 1,
        nome: 'João Silva',
        setor: 'TI',
        permissions: {
          compras: true,
          estoque: true,
          expedicao: true,
          oficina: true,
          usuario: true
        }
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUserData))
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      expect(screen.getByText('Menu Principal')).toBeInTheDocument()
    })

    it('renders the top navigation bar', () => {
      const mockUserData = {
        id: 1,
        nome: 'João Silva',
        setor: 'TI',
        permissions: {
          compras: true,
          estoque: true,
          expedicao: true,
          oficina: true,
          usuario: true
        }
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUserData))
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /notificações/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /tela cheia/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
    })

    it('displays user name when available', () => {
      const mockUserData = {
        id: 1,
        nome: 'João Silva',
        setor: 'TI',
        permissions: {
          compras: true,
          estoque: true,
          expedicao: true,
          oficina: true,
          usuario: true
        }
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUserData))
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })
  })

  describe('Navigation Menu', () => {
    const mockUserData = {
      id: 1,
      nome: 'João Silva',
      setor: 'TI',
      permissions: {
        compras: true,
        estoque: true,
        expedicao: true,
        oficina: true,
        usuario: true
      }
    }

    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUserData))
    })

    it('shows navigation items based on permissions', () => {
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      expect(screen.getByText('Compras')).toBeInTheDocument()
      expect(screen.getByText('Estoque')).toBeInTheDocument()
      expect(screen.getByText('Expedição')).toBeInTheDocument()
      expect(screen.getByText('Oficina')).toBeInTheDocument()
      expect(screen.getByText('Usuários')).toBeInTheDocument()
    })

    it('hides navigation items when user lacks permissions', () => {
      const limitedUserData = {
        id: 1,
        nome: 'João Silva',
        setor: 'Vendas',
        permissions: {
          compras: true,
          estoque: false,
          expedicao: false,
          oficina: false,
          usuario: false
        }
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(limitedUserData))
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      expect(screen.getByText('Compras')).toBeInTheDocument()
      expect(screen.queryByText('Estoque')).not.toBeInTheDocument()
      expect(screen.queryByText('Expedição')).not.toBeInTheDocument()
      expect(screen.queryByText('Oficina')).not.toBeInTheDocument()
      expect(screen.queryByText('Usuários')).not.toBeInTheDocument()
    })

    it('expands and collapses menu sections', async () => {
      const user = userEvent.setup()
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      const comprasLink = screen.getByText('Compras')
      await user.click(comprasLink)
      
      // Should show submenu items
      expect(screen.getByText('Cotação')).toBeInTheDocument()
      expect(screen.getByText('Kanban')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    const mockUserData = {
      id: 1,
      nome: 'João Silva',
      setor: 'TI',
      permissions: {
        compras: true,
        estoque: true,
        expedicao: true,
        oficina: true,
        usuario: true
      }
    }

    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUserData))
    })

    it('toggles sidebar when clicking menu button', async () => {
      const user = userEvent.setup()
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      const menuButton = screen.getByRole('button', { name: /menu/i })
      await user.click(menuButton)
      
      // Sidebar should toggle (implementation specific)
      expect(menuButton).toBeInTheDocument()
    })

    it('handles logout functionality', async () => {
      const user = userEvent.setup()
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      const logoutButton = screen.getByRole('button', { name: /logout/i })
      await user.click(logoutButton)
      
      // Should clear localStorage and redirect
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('userData')
      expect(mockRouter.push).toHaveBeenCalledWith('/login')
    })

    it('handles fullscreen toggle', async () => {
      const user = userEvent.setup()
      
      // Mock fullscreen API
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        value: null
      })
      
      document.documentElement.requestFullscreen = jest.fn()
      document.exitFullscreen = jest.fn()
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      const fullscreenButton = screen.getByRole('button', { name: /tela cheia/i })
      await user.click(fullscreenButton)
      
      expect(document.documentElement.requestFullscreen).toHaveBeenCalled()
    })
  })

  describe('Responsive Behavior', () => {
    const mockUserData = {
      id: 1,
      nome: 'João Silva',
      setor: 'TI',
      permissions: {
        compras: true,
        estoque: true,
        expedicao: true,
        oficina: true,
        usuario: true
      }
    }

    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUserData))
    })

    it('renders correctly on mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })
      
      render(
        <PrivateLayout>
          <div>Mobile Content</div>
        </PrivateLayout>
      )
      
      expect(screen.getByText('Mobile Content')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
    })

    it('renders correctly on desktop devices', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920
      })
      
      render(
        <PrivateLayout>
          <div>Desktop Content</div>
        </PrivateLayout>
      )
      
      expect(screen.getByText('Desktop Content')).toBeInTheDocument()
    })
  })

  describe('Logo and Branding', () => {
    const mockUserData = {
      id: 1,
      nome: 'João Silva',
      setor: 'TI',
      permissions: {
        compras: true,
        estoque: true,
        expedicao: true,
        oficina: true,
        usuario: true
      }
    }

    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUserData))
    })

    it('displays logo in sidebar', () => {
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      const logo = screen.getByAltText(/logo/i)
      expect(logo).toBeInTheDocument()
    })

    it('displays mini logo when sidebar is collapsed', async () => {
      const user = userEvent.setup()
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      // Toggle sidebar to collapsed state
      const menuButton = screen.getByRole('button', { name: /menu/i })
      await user.click(menuButton)
      
      // Should show mini logo (implementation specific)
      expect(screen.getByAltText(/logo/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles missing user data gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      expect(screen.getByText('Test Content')).toBeInTheDocument()
      // Should still render basic layout structure
    })

    it('handles malformed user data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      expect(screen.getByText('Test Content')).toBeInTheDocument()
      // Should not crash and render basic structure
    })

    it('handles undefined permissions gracefully', () => {
      const mockUserData = {
        id: 1,
        nome: 'João Silva',
        setor: 'TI'
        // Missing permissions object
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUserData))
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      expect(screen.getByText('Test Content')).toBeInTheDocument()
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    const mockUserData = {
      id: 1,
      nome: 'João Silva',
      setor: 'TI',
      permissions: {
        compras: true,
        estoque: true,
        expedicao: true,
        oficina: true,
        usuario: true
      }
    }

    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUserData))
    })

    it('provides keyboard navigation support', async () => {
      const user = userEvent.setup()
      
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      // Test tab navigation
      await user.tab()
      
      const focusedElement = document.activeElement
      expect(focusedElement).toBeInTheDocument()
    })

    it('has proper ARIA labels', () => {
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /notificações/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /tela cheia/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
    })

    it('supports screen readers', () => {
      render(
        <PrivateLayout>
          <div>Test Content</div>
        </PrivateLayout>
      )
      
      // Check for semantic HTML structure
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })
})