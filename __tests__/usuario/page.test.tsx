import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UsuariosPage from '@/app/(private)/usuario/page'
import { mockFetchResponse, mockFetchError, setupAuthenticatedUser } from '../utils/test-utils'
import { serviceUrl } from '@/lib/services'

type Usuario = {
  id: string;
  nome: string;
  codigo?: string;
  setor: string;
  senha?: string;
}

describe('Usuários Page', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    setupAuthenticatedUser()
    fetchMock = global.fetch as jest.Mock
    fetchMock.mockClear()
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders the main title and action buttons', () => {
      const mockUsuarios: Usuario[] = []
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockUsuarios))
      
      render(<UsuariosPage />)
      
      expect(screen.getByText('Cadastro de Usuários')).toBeInTheDocument()
      expect(screen.getByTitle('Novo')).toBeInTheDocument()
      expect(screen.getByTitle('Lixeira')).toBeInTheDocument()
    })

    it('loads users on mount', async () => {
      const mockUsuarios = [
        { id: '1', nome: 'João Silva', codigo: 'j.silva', setor: 'TI' },
        { id: '2', nome: 'Maria Santos', codigo: 'm.santos', setor: 'Compras' }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockUsuarios))
      
      render(<UsuariosPage />)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          usuariosUrl(),
          expect.objectContaining({
            method: 'GET',
            headers: { Accept: 'application/json' }
          })
        )
      })
    })

    it('displays users in table', async () => {
      const mockUsuarios = [
        { id: '1', nome: 'João Silva', codigo: 'j.silva', setor: 'TI' },
        { id: '2', nome: 'Maria Santos', codigo: 'm.santos', setor: 'Compras' }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockUsuarios))
      
      render(<UsuariosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('João Silva')).toBeInTheDocument()
        expect(screen.getByText('Maria Santos')).toBeInTheDocument()
        expect(screen.getByText('j.silva')).toBeInTheDocument()
        expect(screen.getByText('m.santos')).toBeInTheDocument()
        expect(screen.getByText('TI')).toBeInTheDocument()
        expect(screen.getByText('Compras')).toBeInTheDocument()
      })
    })

    it('shows empty message when no users found', async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse([]))
      
      render(<UsuariosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument()
      })
    })
  })

  describe('Form Interactions', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse([]))
      render(<UsuariosPage />)
      await waitFor(() => {
        expect(screen.getByTitle('Novo')).toBeInTheDocument()
      })
    })

    it('opens form when clicking new button', async () => {
      const user = userEvent.setup()
      
      const newButton = screen.getByTitle('Novo')
      await user.click(newButton)
      
      expect(screen.getByLabelText('Nome')).toBeInTheDocument()
      expect(screen.getByLabelText('Código de Usuário')).toBeInTheDocument()
      expect(screen.getByLabelText('Setor')).toBeInTheDocument()
      expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    })

    it('allows filling form fields', async () => {
      const user = userEvent.setup()
      
      // Open form
      await user.click(screen.getByTitle('Novo'))
      
      // Fill fields
      await user.type(screen.getByLabelText('Nome'), 'Test User')
      await user.type(screen.getByLabelText('Código de Usuário'), 'test.user')
      await user.selectOptions(screen.getByLabelText('Setor'), 'TI')
      await user.type(screen.getByLabelText('Senha'), 'password123')
      
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test.user')).toBeInTheDocument()
      expect(screen.getByDisplayValue('TI')).toBeInTheDocument()
      expect(screen.getByDisplayValue('password123')).toBeInTheDocument()
    })

    it('shows all sector options in select', async () => {
      const user = userEvent.setup()
      
      await user.click(screen.getByTitle('Novo'))
      
      const setorSelect = screen.getByLabelText('Setor')
      
      expect(screen.getByText('Selecione um setor')).toBeInTheDocument()
      expect(screen.getByText('Estoque')).toBeInTheDocument()
      expect(screen.getByText('Oficina')).toBeInTheDocument()
      expect(screen.getByText('Compras')).toBeInTheDocument()
      expect(screen.getByText('Administrativo')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('TI')).toBeInTheDocument()
      expect(screen.getByText('Expedição')).toBeInTheDocument()
    })
  })

  describe('User Creation', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse([])) // Initial load
      render(<UsuariosPage />)
      await waitFor(() => {
        expect(screen.getByTitle('Novo')).toBeInTheDocument()
      })
    })

    it('creates user successfully', async () => {
      const user = userEvent.setup()
      
      // Mock successful creation and reload
      fetchMock.mockResolvedValueOnce(mockFetchResponse({})) // Create response
      fetchMock.mockResolvedValueOnce(mockFetchResponse([
        { id: '1', nome: 'Test User', codigo: 'test.user', setor: 'TI' }
      ])) // Reload response
      
      // Open form and fill
      await user.click(screen.getByTitle('Novo'))
      await user.type(screen.getByLabelText('Nome'), 'Test User')
      await user.type(screen.getByLabelText('Código de Usuário'), 'test.user')
      await user.selectOptions(screen.getByLabelText('Setor'), 'TI')
      await user.type(screen.getByLabelText('Senha'), 'password123')
      
      // Submit
      await user.click(screen.getByText('Salvar'))
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          usuariosUrl(),
          expect.objectContaining({
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              nome: 'Test User',
              codigo: 'test.user',
              setor: 'TI',
              senha: 'password123'
            })
          })
        )
      })
    })

    it('clears form after successful creation', async () => {
      const user = userEvent.setup()
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse({}))
      fetchMock.mockResolvedValueOnce(mockFetchResponse([]))
      
      await user.click(screen.getByTitle('Novo'))
      await user.type(screen.getByLabelText('Nome'), 'Test User')
      await user.type(screen.getByLabelText('Código de Usuário'), 'test.user')
      await user.selectOptions(screen.getByLabelText('Setor'), 'TI')
      await user.type(screen.getByLabelText('Senha'), 'password123')
      
      await user.click(screen.getByText('Salvar'))
      
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Test User')).not.toBeInTheDocument()
      })
    })

    it('handles creation error', async () => {
      const user = userEvent.setup()
      window.alert = jest.fn()
      
      fetchMock.mockRejectedValueOnce(new Error('Server error'))
      
      await user.click(screen.getByTitle('Novo'))
      await user.type(screen.getByLabelText('Nome'), 'Test User')
      await user.click(screen.getByText('Salvar'))
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Server error')
      })
    })
  })

  describe('User Deletion', () => {
    const mockUsuarios = [
      { id: '1', nome: 'João Silva', codigo: 'j.silva', setor: 'TI' },
      { id: '2', nome: 'Maria Santos', codigo: 'm.santos', setor: 'Compras' }
    ]

    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockUsuarios))
      render(<UsuariosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('João Silva')).toBeInTheDocument()
      })
    })

    it('deletes user successfully', async () => {
      const user = userEvent.setup()
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse({}))
      
      const deleteButtons = screen.getAllByTitle('Lixeira')
      const userDeleteButton = deleteButtons.find(btn => 
        btn.closest('tr')?.textContent?.includes('João Silva')
      )
      
      await user.click(userDeleteButton!)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          usuariosUrl('/1'),
          expect.objectContaining({
            method: 'DELETE',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            }
          })
        )
      })
      
      // User should be removed from local state
      expect(screen.queryByText('João Silva')).not.toBeInTheDocument()
      expect(screen.getByText('Maria Santos')).toBeInTheDocument() // Other user remains
    })

    it('handles deletion error', async () => {
      const user = userEvent.setup()
      window.alert = jest.fn()
      
      fetchMock.mockRejectedValueOnce(new Error('Delete failed'))
      
      const deleteButtons = screen.getAllByTitle('Lixeira')
      const userDeleteButton = deleteButtons.find(btn => 
        btn.closest('tr')?.textContent?.includes('João Silva')
      )
      
      await user.click(userDeleteButton!)
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Delete failed')
      })
      
      // User should still be in the list
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })
  })

  describe('Table Features', () => {
    beforeEach(async () => {
      const mockUsuarios = [
        { id: '1', nome: 'João Silva', codigo: 'j.silva', setor: 'TI' },
        { id: '2', nome: 'Maria Santos', setor: 'Compras' } // No código
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockUsuarios))
      render(<UsuariosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('João Silva')).toBeInTheDocument()
      })
    })

    it('displays table headers correctly', () => {
      expect(screen.getByText('Nome')).toBeInTheDocument()
      expect(screen.getByText('Código')).toBeInTheDocument()
      expect(screen.getByText('Setor')).toBeInTheDocument()
      expect(screen.getByText('Ações')).toBeInTheDocument()
    })

    it('shows dash for missing code', () => {
      expect(screen.getByText('-')).toBeInTheDocument() // For Maria Santos without code
    })

    it('renders action buttons for each user', () => {
      const editButtons = screen.getAllByTitle('Editar')
      const deleteButtons = screen.getAllByTitle('Lixeira')
      
      expect(editButtons).toHaveLength(2)
      expect(deleteButtons).toHaveLength(3) // 2 users + 1 main button
    })

    it('renders checkboxes', () => {
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThanOrEqual(3) // Header + 2 users
    })
  })

  describe('Action Bar', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse([]))
      render(<UsuariosPage />)
      await waitFor(() => {
        expect(screen.getByText('Cadastro de Usuários')).toBeInTheDocument()
      })
    })

    it('renders all action buttons', () => {
      expect(screen.getByText('Filtro Avançado')).toBeInTheDocument()
      expect(screen.getByText('Pesquisar')).toBeInTheDocument()
      expect(screen.getByText('PDF')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Buscar')).toBeInTheDocument()
    })

    it('allows typing in search field', async () => {
      const user = userEvent.setup()
      
      const searchInput = screen.getByPlaceholderText('Buscar')
      await user.type(searchInput, 'test search')
      
      expect(searchInput).toHaveValue('test search')
    })

    it('has refresh button that reloads users', async () => {
      const user = userEvent.setup()
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse([
        { id: '1', nome: 'New User', codigo: 'new.user', setor: 'TI' }
      ]))
      
      const refreshButton = screen.getByTestId('fa-sync').closest('button')
      if (refreshButton) {
        await user.click(refreshButton)
      }
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2) // Initial + refresh
      })
    })
  })

  describe('Loading and Error States', () => {
    it('handles loading error on mount', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
      fetchMock.mockRejectedValueOnce(new Error('Network error'))
      
      render(<UsuariosPage />)
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Erro ao carregar usuários: Network error')
      })
      
      alertSpy.mockRestore()
    })

    it('handles HTTP error responses', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Server Error' })
      })
      
      render(<UsuariosPage />)
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Erro ao carregar usuários: Erro HTTP: 500')
      })
      
      alertSpy.mockRestore()
    })
  })

  describe('Form Validation', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse([]))
      render(<UsuariosPage />)
      
      const user = userEvent.setup()
      await user.click(screen.getByTitle('Novo'))
    })

    it('allows submitting form with all fields filled', async () => {
      const user = userEvent.setup()
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse({}))
      fetchMock.mockResolvedValueOnce(mockFetchResponse([]))
      
      await user.type(screen.getByLabelText('Nome'), 'Complete User')
      await user.type(screen.getByLabelText('Código de Usuário'), 'complete.user')
      await user.selectOptions(screen.getByLabelText('Setor'), 'TI')
      await user.type(screen.getByLabelText('Senha'), 'password123')
      
      await user.click(screen.getByText('Salvar'))
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/usuarios'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })

    it('submits form even with missing optional fields', async () => {
      const user = userEvent.setup()
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse({}))
      fetchMock.mockResolvedValueOnce(mockFetchResponse([]))
      
      await user.type(screen.getByLabelText('Nome'), 'Minimal User')
      // Leave other fields empty
      
      await user.click(screen.getByText('Salvar'))
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/usuarios'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              nome: 'Minimal User',
              codigo: '',
              setor: '',
              senha: ''
            })
          })
        )
      })
    })
  })
})
