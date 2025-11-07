import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CotacaoPage from '@/app/(private)/compras/cotacao/page'
import { mockFetchResponse, mockFetchError, setupAuthenticatedUser } from '../../utils/test-utils'

// Mock PrivateRoute
jest.mock('@/components/PrivateRoute', () => {
  return function MockPrivateRoute({ children }: { children: React.ReactNode }) {
    return <>{children}</>
  }
})

describe('Cotação Page', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    setupAuthenticatedUser()
    fetchMock = global.fetch as jest.Mock
    fetchMock.mockClear()
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders the main title', () => {
      render(<CotacaoPage />)
      expect(screen.getByText('Cotações')).toBeInTheDocument()
    })

    it('renders create quotation form', () => {
      render(<CotacaoPage />)
      
      expect(screen.getByText('Criar Cotação')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Pedido de cotação')).toBeInTheDocument()
      expect(screen.getByText('Buscar')).toBeInTheDocument()
    })

    it('renders the pedidos table section', () => {
      render(<CotacaoPage />)
      
      expect(screen.getByText('Pedidos de Cotação')).toBeInTheDocument()
      expect(screen.getByText('Empresa')).toBeInTheDocument()
      expect(screen.getByText('Pedido')).toBeInTheDocument()
      expect(screen.getByText('Itens')).toBeInTheDocument()
      expect(screen.getByText('Ações')).toBeInTheDocument()
    })

    it('loads pedidos on mount', async () => {
      const mockPedidos = {
        data: [
          { empresa: 3, pedido_cotacao: 12345, total_itens: 5 },
          { empresa: 3, pedido_cotacao: 12346, total_itens: 3 }
        ]
      }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockPedidos))
      
      render(<CotacaoPage />)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/compras/pedidos-cotacao'),
          expect.objectContaining({
            headers: { Accept: 'application/json' }
          })
        )
      })
    })
  })

  describe('Search Quotation Functionality', () => {
    it('shows error when searching with empty pedido', async () => {
      const user = userEvent.setup()
      render(<CotacaoPage />)
      
      const searchButton = screen.getByText('Buscar')
      await user.click(searchButton)
      
      expect(screen.getByText('Informe o pedido de cotação.')).toBeInTheDocument()
    })

    it('searches for quotation items successfully', async () => {
      const user = userEvent.setup()
      const mockItens = {
        itens: [
          {
            PEDIDO_COTACAO: 12345,
            EMISSAO: '2024-01-01',
            PRO_CODIGO: 1001,
            PRO_DESCRICAO: 'Produto Teste',
            MAR_DESCRICAO: 'Marca Teste',
            REFERENCIA: 'REF001',
            UNIDADE: 'PÇ',
            QUANTIDADE: 10
          }
        ]
      }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockItens))
      
      render(<CotacaoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Pedido de cotação')
      const searchButton = screen.getByText('Buscar')
      
      await user.type(pedidoInput, '12345')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/compras/openquery/pedido/12345'),
          expect.objectContaining({
            headers: { Accept: 'application/json' }
          })
        )
      })
    })

    it('shows message when no items found', async () => {
      const user = userEvent.setup()
      const mockEmptyResponse = { itens: [] }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockEmptyResponse))
      
      render(<CotacaoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Pedido de cotação')
      const searchButton = screen.getByText('Buscar')
      
      await user.type(pedidoInput, '99999')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument()
      })
    })

    it('handles search error', async () => {
      const user = userEvent.setup()
      fetchMock.mockRejectedValueOnce(new Error('Network error'))
      
      render(<CotacaoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Pedido de cotação')
      const searchButton = screen.getByText('Buscar')
      
      await user.type(pedidoInput, '12345')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Erro ao buscar: Network error/)).toBeInTheDocument()
      })
    })
  })

  describe('Create Quotation Functionality', () => {
    it('shows error when trying to create without pedido', async () => {
      const user = userEvent.setup()
      render(<CotacaoPage />)
      
      const createButton = screen.getByText('Criar')
      await user.click(createButton)
      
      expect(screen.getByText('Informe o pedido de cotação.')).toBeInTheDocument()
    })

    it('shows error when trying to create without items', async () => {
      const user = userEvent.setup()
      render(<CotacaoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Pedido de cotação')
      const createButton = screen.getByText('Criar')
      
      await user.type(pedidoInput, '12345')
      await user.click(createButton)
      
      expect(screen.getByText('Busque o pedido antes de criar a cotação.')).toBeInTheDocument()
    })

    it('creates quotation successfully', async () => {
      const user = userEvent.setup()
      
      // Mock search response
      const mockItens = {
        itens: [
          {
            PEDIDO_COTACAO: 12345,
            EMISSAO: '2024-01-01',
            PRO_CODIGO: 1001,
            PRO_DESCRICAO: 'Produto Teste',
            MAR_DESCRICAO: 'Marca Teste',
            REFERENCIA: 'REF001',
            UNIDADE: 'PÇ',
            QUANTIDADE: 10
          }
        ]
      }
      
      // Mock create response
      const mockCreateResponse = { total_itens: 1 }
      
      // Mock pedidos list response
      const mockPedidos = { data: [] }
      
      fetchMock
        .mockResolvedValueOnce(mockFetchResponse(mockItens)) // Search
        .mockResolvedValueOnce(mockFetchResponse(mockCreateResponse)) // Create
        .mockResolvedValueOnce(mockFetchResponse(mockPedidos)) // Reload pedidos
      
      render(<CotacaoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Pedido de cotação')
      const searchButton = screen.getByText('Buscar')
      
      // First search for items
      await user.type(pedidoInput, '12345')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Produto Teste')).toBeInTheDocument()
      })
      
      // Then create quotation
      const createButton = screen.getByText('Criar')
      await user.click(createButton)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/compras/pedidos-cotacao'),
          expect.objectContaining({
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            }
          })
        )
      })
    })
  })

  describe('Quotation Items Display', () => {
    it('displays quotation items after successful search', async () => {
      const user = userEvent.setup()
      const mockItens = {
        itens: [
          {
            PEDIDO_COTACAO: 12345,
            EMISSAO: '2024-01-01',
            PRO_CODIGO: 1001,
            PRO_DESCRICAO: 'Produto Teste',
            MAR_DESCRICAO: 'Marca Teste',
            REFERENCIA: 'REF001',
            UNIDADE: 'PÇ',
            QUANTIDADE: 10
          }
        ]
      }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockItens))
      
      render(<CotacaoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Pedido de cotação')
      const searchButton = screen.getByText('Buscar')
      
      await user.type(pedidoInput, '12345')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Produto Teste')).toBeInTheDocument()
        expect(screen.getByText('Marca Teste')).toBeInTheDocument()
        expect(screen.getByText('REF001')).toBeInTheDocument()
        expect(screen.getByText('PÇ')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
      })
    })

    it('displays multiple quotation items', async () => {
      const user = userEvent.setup()
      const mockItens = {
        itens: [
          {
            PEDIDO_COTACAO: 12345,
            EMISSAO: '2024-01-01',
            PRO_CODIGO: 1001,
            PRO_DESCRICAO: 'Produto 1',
            MAR_DESCRICAO: 'Marca 1',
            REFERENCIA: 'REF001',
            UNIDADE: 'PÇ',
            QUANTIDADE: 10
          },
          {
            PEDIDO_COTACAO: 12345,
            EMISSAO: '2024-01-01',
            PRO_CODIGO: 1002,
            PRO_DESCRICAO: 'Produto 2',
            MAR_DESCRICAO: 'Marca 2',
            REFERENCIA: 'REF002',
            UNIDADE: 'UN',
            QUANTIDADE: 5
          }
        ]
      }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockItens))
      
      render(<CotacaoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Pedido de cotação')
      const searchButton = screen.getByText('Buscar')
      
      await user.type(pedidoInput, '12345')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Produto 1')).toBeInTheDocument()
        expect(screen.getByText('Produto 2')).toBeInTheDocument()
        expect(screen.getByText('Marca 1')).toBeInTheDocument()
        expect(screen.getByText('Marca 2')).toBeInTheDocument()
      })
    })
  })

  describe('Pedidos List', () => {
    it('displays loaded pedidos in table', async () => {
      const mockPedidos = {
        data: [
          { empresa: 3, pedido_cotacao: 12345, total_itens: 5 },
          { empresa: 3, pedido_cotacao: 12346, total_itens: 3 }
        ]
      }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockPedidos))
      
      render(<CotacaoPage />)
      
      await waitFor(() => {
        expect(screen.getByText('12345')).toBeInTheDocument()
        expect(screen.getByText('12346')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
      })
    })

    it('shows message when no pedidos found', async () => {
      const mockEmptyPedidos = { data: [] }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockEmptyPedidos))
      
      render(<CotacaoPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Nenhum pedido encontrado.')).toBeInTheDocument()
      })
    })

    it('handles pedidos loading error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Server error'))
      
      render(<CotacaoPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Erro ao carregar: Server error/)).toBeInTheDocument()
      })
    })
  })

  describe('Page Size Control', () => {
    it('allows changing page size', async () => {
      const user = userEvent.setup()
      const mockPedidos = { data: [] }
      fetchMock.mockResolvedValue(mockFetchResponse(mockPedidos))
      
      render(<CotacaoPage />)
      
      // Find and click the page size dropdown
      const pageSizeSelect = screen.getByDisplayValue('10')
      await user.selectOptions(pageSizeSelect, '20')
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('pageSize=20'),
          expect.any(Object)
        )
      })
    })
  })

  describe('Fornecedor Modal', () => {
    beforeEach(async () => {
      const mockPedidos = {
        data: [{ empresa: 3, pedido_cotacao: 12345, total_itens: 5 }]
      }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockPedidos))
      
      render(<CotacaoPage />)
      
      await waitFor(() => {
        expect(screen.getByText('12345')).toBeInTheDocument()
      })
    })

    it('opens fornecedor modal when clicking fornecedor button', async () => {
      const user = userEvent.setup()
      const mockFornecedores = { data: [] }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockFornecedores))
      
      const fornecedorButton = screen.getByText('Fornecedor')
      await user.click(fornecedorButton)
      
      await waitFor(() => {
        expect(screen.getByText('Gerenciar Fornecedores')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Código do fornecedor')).toBeInTheDocument()
      })
    })

    it('closes modal when clicking close button', async () => {
      const user = userEvent.setup()
      const mockFornecedores = { data: [] }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockFornecedores))
      
      // Open modal
      const fornecedorButton = screen.getByText('Fornecedor')
      await user.click(fornecedorButton)
      
      await waitFor(() => {
        expect(screen.getByText('Gerenciar Fornecedores')).toBeInTheDocument()
      })
      
      // Close modal
      const closeButton = screen.getByText('Fechar')
      await user.click(closeButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Gerenciar Fornecedores')).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Interactions', () => {
    it('updates pedido input value', async () => {
      const user = userEvent.setup()
      render(<CotacaoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Pedido de cotação')
      await user.type(pedidoInput, '12345')
      
      expect(pedidoInput).toHaveValue('12345')
    })

    it('clears form after successful quotation creation', async () => {
      const user = userEvent.setup()
      
      // Setup mocks for complete flow
      const mockItens = { itens: [{ PEDIDO_COTACAO: 12345, PRO_DESCRICAO: 'Test', QUANTIDADE: 1 }] }
      const mockCreateResponse = { total_itens: 1 }
      const mockPedidos = { data: [] }
      
      fetchMock
        .mockResolvedValueOnce(mockFetchResponse(mockItens))
        .mockResolvedValueOnce(mockFetchResponse(mockCreateResponse))
        .mockResolvedValueOnce(mockFetchResponse(mockPedidos))
      
      render(<CotacaoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Pedido de cotação')
      
      await user.type(pedidoInput, '12345')
      await user.click(screen.getByText('Buscar'))
      
      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Criar'))
      
      await waitFor(() => {
        expect(pedidoInput).toHaveValue('')
      })
    })
  })
})