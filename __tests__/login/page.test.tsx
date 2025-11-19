import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import Login from '@/app/login/page'
import { mockFetchResponse, mockFetchError, setupAuthenticatedUser } from '../utils/test-utils'
import { serviceUrl } from '@/lib/services'

// Mock the router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock the logo import
jest.mock('@/app/logo.svg', () => ({
  default: '/mock-logo.svg',
  src: '/mock-logo.svg',
}))

describe('Login Page', () => {
  let fetchMock: jest.Mock
  const LOGIN_URL = serviceUrl("sistema", "/login")

  beforeEach(() => {
    setupAuthenticatedUser()
    fetchMock = global.fetch as jest.Mock
    fetchMock.mockClear()
    mockPush.mockClear()
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders login form correctly', () => {
      render(<Login />)
      
      expect(screen.getByText('Olá! Vamos iniciar.')).toBeInTheDocument()
      expect(screen.getByText('Entre com sua conta')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Senha')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
      expect(screen.getByText('Manter-me conectado')).toBeInTheDocument()
      expect(screen.getByText('Esqueceu a senha?')).toBeInTheDocument()
    })

    it('renders logo image', () => {
      render(<Login />)
      
      const logoImage = screen.getByAltText('icon')
      expect(logoImage).toBeInTheDocument()
      expect(logoImage).toHaveAttribute('src', '/mock-logo.svg')
    })
  })

  describe('Form Interactions', () => {
    it('updates email input value when user types', async () => {
      const user = userEvent.setup()
      render(<Login />)
      
      const emailInput = screen.getByPlaceholderText('Email')
      await user.type(emailInput, 'test@example.com')
      
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('updates password input value when user types', async () => {
      const user = userEvent.setup()
      render(<Login />)
      
      const passwordInput = screen.getByPlaceholderText('Senha')
      await user.type(passwordInput, 'password123')
      
      expect(passwordInput).toHaveValue('password123')
    })

    it('shows password input as password type', () => {
      render(<Login />)
      
      const passwordInput = screen.getByPlaceholderText('Senha')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Login Functionality', () => {
    it('calls login API with correct credentials on form submit', async () => {
      const user = userEvent.setup()
      const mockResponse = { success: true, id: 1, nome: 'Test User' }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockResponse))
      
      render(<Login />)
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Senha'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Entrar' }))
      
      expect(fetchMock).toHaveBeenCalledWith(
        LOGIN_URL,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ codigo: 'test@example.com', senha: 'password123' }),
        }
      )
    })

    it('redirects to home page on successful login', async () => {
      const user = userEvent.setup()
      const mockResponse = { success: true, id: 1, nome: 'Test User' }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockResponse))
      
      render(<Login />)
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Senha'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Entrar' }))
      
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('auth', 'true')
        expect(localStorage.setItem).toHaveBeenCalledWith('userData', JSON.stringify(mockResponse))
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    it('shows alert on login failure', async () => {
      const user = userEvent.setup()
      const mockResponse = { success: false, message: 'Credenciais inválidas' }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockResponse))
      window.alert = jest.fn()
      
      render(<Login />)
      
      await user.type(screen.getByPlaceholderText('Email'), 'wrong@example.com')
      await user.type(screen.getByPlaceholderText('Senha'), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: 'Entrar' }))
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Credenciais inválidas')
        expect(mockPush).not.toHaveBeenCalled()
      })
    })

    it('shows alert on network error', async () => {
      const user = userEvent.setup()
      fetchMock.mockRejectedValueOnce(new Error('Network error'))
      window.alert = jest.fn()
      
      render(<Login />)
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Senha'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Entrar' }))
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Erro ao conectar ao servidor')
        expect(mockPush).not.toHaveBeenCalled()
      })
    })

    it('handles login with empty credentials', async () => {
      const user = userEvent.setup()
      const mockResponse = { success: false, message: 'Campos obrigatórios' }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockResponse))
      window.alert = jest.fn()
      
      render(<Login />)
      
      await user.click(screen.getByRole('button', { name: 'Entrar' }))
      
      expect(fetchMock).toHaveBeenCalledWith(
        LOGIN_URL,
        expect.objectContaining({
          body: JSON.stringify({ codigo: '', senha: '' }),
        })
      )
    })
  })

  describe('Additional Features', () => {
    it('handles forgot password link click', async () => {
      const user = userEvent.setup()
      window.alert = jest.fn()
      
      render(<Login />)
      
      const forgotPasswordLink = screen.getByText('Esqueceu a senha?')
      await user.click(forgotPasswordLink)
      
      expect(window.alert).toHaveBeenCalledWith('Recuperar senha')
    })

    it('renders remember me checkbox', () => {
      render(<Login />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
    })

    it('allows checking remember me checkbox', async () => {
      const user = userEvent.setup()
      render(<Login />)
      
      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)
      
      expect(checkbox).toBeChecked()
    })
  })

  describe('Form Validation', () => {
    it('maintains form state during interaction', async () => {
      const user = userEvent.setup()
      render(<Login />)
      
      const emailInput = screen.getByPlaceholderText('Email')
      const passwordInput = screen.getByPlaceholderText('Senha')
      
      await user.type(emailInput, 'test')
      await user.type(passwordInput, 'pass')
      await user.clear(emailInput)
      await user.type(emailInput, 'final@test.com')
      
      expect(emailInput).toHaveValue('final@test.com')
      expect(passwordInput).toHaveValue('pass')
    })
  })

  describe('Edge Cases', () => {
    it('handles successful login without message', async () => {
      const user = userEvent.setup()
      const mockResponse = { success: false } // No message property
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockResponse))
      window.alert = jest.fn()
      
      render(<Login />)
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Senha'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Entrar' }))
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Login inválido')
      })
    })

    it('handles malformed JSON response', async () => {
      const user = userEvent.setup()
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })
      window.alert = jest.fn()
      
      render(<Login />)
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Senha'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Entrar' }))
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Erro ao conectar ao servidor')
      })
    })
  })
})
