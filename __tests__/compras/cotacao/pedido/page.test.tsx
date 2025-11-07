import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PedidoPage from '@/app/(private)/compras/cotacao/pedido/page'
import { mockFetchResponse, mockFetchError, setupAuthenticatedUser } from '../../../utils/test-utils'

interface CotacaoItem {
  PEDIDO_COTACAO: number;
  EMISSAO: string | null;
  PRO_CODIGO: number | string;
  PRO_DESCRICAO: string;
  MAR_DESCRICAO: string | null;
  REFERENCIA: string | null;
  UNIDADE: string | null;
  QUANTIDADE: number;
}

interface PedidoListItem {
  id: string;
  for_codigo: string;
  pedido_cotacao: number;
  created_at: string;
  itens_count: number;
  total_qtd: number;
  total_valor: number;
  total_valor_fmt: string;
}

describe('Pedido Page', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    setupAuthenticatedUser()
    fetchMock = global.fetch as jest.Mock
    fetchMock.mockClear()
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders the main title', () => {
      render(<PedidoPage />)
      
      expect(screen.getByText('PEDIDOS DE COTAÇÃO')).toBeInTheDocument()
    })

    it('renders the create quotation section', () => {
      render(<PedidoPage />)
      
      expect(screen.getByText('CRIAR COTAÇÃO')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /adicionar cotação/i })).toBeInTheDocument()
    })

    it('renders the existing orders section', () => {
      render(<PedidoPage />)
      
      expect(screen.getByText('PEDIDOS EXISTENTES')).toBeInTheDocument()
      expect(screen.getByText('Atualizar Lista')).toBeInTheDocument()
    })

    it('initially hides the cotacao form', () => {
      render(<PedidoPage />)
      
      expect(screen.queryByPlaceholderText('Digite o pedido de cotação')).not.toBeInTheDocument()
    })

    it('loads existing orders on mount', async () => {
      const mockPedidos: PedidoListItem[] = [
        {
          id: 'uuid-1',
          for_codigo: '123',
          pedido_cotacao: 1001,
          created_at: '2024-01-01T10:00:00Z',
          itens_count: 5,
          total_qtd: 100,
          total_valor: 1500.50,
          total_valor_fmt: '1.500,50'
        }
      ]
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockPedidos))
      
      render(<PedidoPage />)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          'https://intranetbackend.acacessorios.local/compras/pedidos-cotacao'
        )
      })
    })
  })

  describe('Cotacao Form', () => {
    it('shows cotacao form when clicking add button', async () => {
      const user = userEvent.setup()
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      expect(screen.getByPlaceholderText('Digite o pedido de cotação')).toBeInTheDocument()
      expect(screen.getByText('Buscar Cotação')).toBeInTheDocument()
    })

    it('hides cotacao form when clicking add button again', async () => {
      const user = userEvent.setup()
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      await user.click(addButton)
      
      expect(screen.queryByPlaceholderText('Digite o pedido de cotação')).not.toBeInTheDocument()
    })

    it('requires pedido to be filled before searching', async () => {
      const user = userEvent.setup()
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      expect(screen.getByText('Informe o pedido de cotação.')).toBeInTheDocument()
    })

    it('searches for cotacao when form is submitted', async () => {
      const user = userEvent.setup()
      const mockCotacaoData = {
        itens: [
          {
            PEDIDO_COTACAO: 123,
            EMISSAO: '2024-01-01',
            PRO_CODIGO: 1001,
            PRO_DESCRICAO: 'Produto Teste',
            MAR_DESCRICAO: 'Marca Teste',
            REFERENCIA: 'REF001',
            UNIDADE: 'UN',
            QUANTIDADE: 10
          }
        ]
      }
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockCotacaoData))
      
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Digite o pedido de cotação')
      await user.type(input, '123')
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          'https://intranetbackend.acacessorios.local/compras/openquery/pedido/123?empresa=3',
          expect.objectContaining({
            headers: { Accept: 'application/json' }
          })
        )
      })
    })

    it('displays cotacao items after search', async () => {
      const user = userEvent.setup()
      const mockCotacaoData = {
        itens: [
          {
            PEDIDO_COTACAO: 123,
            EMISSAO: '2024-01-01',
            PRO_CODIGO: 1001,
            PRO_DESCRICAO: 'Produto Teste',
            MAR_DESCRICAO: 'Marca Teste',
            REFERENCIA: 'REF001',
            UNIDADE: 'UN',
            QUANTIDADE: 10
          }
        ]
      }
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockCotacaoData))
      
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Digite o pedido de cotação')
      await user.type(input, '123')
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Produto Teste')).toBeInTheDocument()
        expect(screen.getByText('Marca Teste')).toBeInTheDocument()
        expect(screen.getByText('REF001')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
      })
    })

    it('shows error message when search fails', async () => {
      const user = userEvent.setup()
      fetchMock.mockRejectedValueOnce(new Error('Network error'))
      
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Digite o pedido de cotação')
      await user.type(input, '123')
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Erro ao buscar: Network error')).toBeInTheDocument()
      })
    })

    it('shows message when no items are found', async () => {
      const user = userEvent.setup()
      const mockCotacaoData = { itens: [] }
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockCotacaoData))
      
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Digite o pedido de cotação')
      await user.type(input, '123')
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument()
      })
    })
  })

  describe('Cotacao Creation', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      const mockCotacaoData = {
        itens: [
          {
            PEDIDO_COTACAO: 123,
            EMISSAO: '2024-01-01',
            PRO_CODIGO: 1001,
            PRO_DESCRICAO: 'Produto Teste',
            MAR_DESCRICAO: 'Marca Teste',
            REFERENCIA: 'REF001',
            UNIDADE: 'UN',
            QUANTIDADE: 10
          }
        ]
      }
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockCotacaoData))
      
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Digite o pedido de cotação')
      await user.type(input, '123')
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Produto Teste')).toBeInTheDocument()
      })
    })

    it('shows create button after items are loaded', () => {
      expect(screen.getByText('Criar Cotação')).toBeInTheDocument()
    })

    it('creates cotacao when clicking create button', async () => {
      const user = userEvent.setup()
      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: true }))
      
      const createButton = screen.getByText('Criar Cotação')
      await user.click(createButton)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          'https://intranetbackend.acacessorios.local/compras/pedidos-cotacao',
          expect.objectContaining({
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            },
            body: expect.stringContaining('123')
          })
        )
      })
    })

    it('shows success message after creating cotacao', async () => {
      const user = userEvent.setup()
      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: true }))
      
      const createButton = screen.getByText('Criar Cotação')
      await user.click(createButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Cotação criada com sucesso/)).toBeInTheDocument()
      })
    })

    it('shows error message when creation fails', async () => {
      const user = userEvent.setup()
      fetchMock.mockRejectedValueOnce(new Error('Creation failed'))
      
      const createButton = screen.getByText('Criar Cotação')
      await user.click(createButton)
      
      await waitFor(() => {
        expect(screen.getByText('Erro: Creation failed')).toBeInTheDocument()
      })
    })

    it('requires items to be loaded before creating', async () => {
      const user = userEvent.setup()
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      // Don't search for items, just try to create
      expect(screen.queryByText('Criar Cotação')).not.toBeInTheDocument()
    })
  })

  describe('Existing Orders List', () => {
    const mockPedidos: PedidoListItem[] = [
      {
        id: 'uuid-1',
        for_codigo: '123',
        pedido_cotacao: 1001,
        created_at: '2024-01-01T10:00:00Z',
        itens_count: 5,
        total_qtd: 100,
        total_valor: 1500.50,
        total_valor_fmt: '1.500,50'
      },
      {
        id: 'uuid-2',
        for_codigo: '456',
        pedido_cotacao: 1002,
        created_at: '2024-01-02T15:30:00Z',
        itens_count: 3,
        total_qtd: 50,
        total_valor: 750.25,
        total_valor_fmt: '750,25'
      }
    ]

    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockPedidos))
      render(<PedidoPage />)
      
      await waitFor(() => {
        expect(screen.getByText('1001')).toBeInTheDocument()
      })
    })

    it('displays orders in table format', () => {
      expect(screen.getByText('Pedido')).toBeInTheDocument()
      expect(screen.getByText('Fornecedor')).toBeInTheDocument()
      expect(screen.getByText('Criado em')).toBeInTheDocument()
      expect(screen.getByText('Itens')).toBeInTheDocument()
      expect(screen.getByText('Quantidade Total')).toBeInTheDocument()
      expect(screen.getByText('Valor Total')).toBeInTheDocument()
      
      expect(screen.getByText('1001')).toBeInTheDocument()
      expect(screen.getByText('1002')).toBeInTheDocument()
      expect(screen.getByText('123')).toBeInTheDocument()
      expect(screen.getByText('456')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText('R$ 1.500,50')).toBeInTheDocument()
      expect(screen.getByText('R$ 750,25')).toBeInTheDocument()
    })

    it('formats dates correctly', () => {
      expect(screen.getByText(/01\/01\/2024/)).toBeInTheDocument()
      expect(screen.getByText(/02\/01\/2024/)).toBeInTheDocument()
    })

    it('refreshes list when clicking update button', async () => {
      const user = userEvent.setup()
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockPedidos))
      
      const updateButton = screen.getByText('Atualizar Lista')
      await user.click(updateButton)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2) // Initial load + refresh
      })
    })

    it('shows loading state while refreshing', async () => {
      const user = userEvent.setup()
      fetchMock.mockImplementation(() => new Promise(() => {}))
      
      render(<PedidoPage />)
      
      const updateButton = screen.getByText('Atualizar Lista')
      await user.click(updateButton)
      
      expect(screen.getByText('Carregando...')).toBeInTheDocument()
    })

    it('shows empty state when no orders exist', async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse([]))
      
      render(<PedidoPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Nenhum pedido encontrado.')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading state when searching for cotacao', async () => {
      const user = userEvent.setup()
      fetchMock.mockImplementation(() => new Promise(() => {}))
      
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Digite o pedido de cotação')
      await user.type(input, '123')
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      expect(screen.getByText('Buscando...')).toBeInTheDocument()
    })

    it('shows loading state when creating cotacao', async () => {
      const user = userEvent.setup()
      const mockCotacaoData = {
        itens: [
          {
            PEDIDO_COTACAO: 123,
            EMISSAO: '2024-01-01',
            PRO_CODIGO: 1001,
            PRO_DESCRICAO: 'Produto Teste',
            MAR_DESCRICAO: 'Marca Teste',
            REFERENCIA: 'REF001',
            UNIDADE: 'UN',
            QUANTIDADE: 10
          }
        ]
      }
      
      fetchMock
        .mockResolvedValueOnce(mockFetchResponse(mockCotacaoData))
        .mockImplementation(() => new Promise(() => {}))
      
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Digite o pedido de cotação')
      await user.type(input, '123')
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Produto Teste')).toBeInTheDocument()
      })
      
      const createButton = screen.getByText('Criar Cotação')
      await user.click(createButton)
      
      expect(screen.getByText('Criando...')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles network errors when loading orders', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))
      
      render(<PedidoPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Erro: Network error')).toBeInTheDocument()
      })
    })

    it('handles HTTP errors when creating cotacao', async () => {
      const user = userEvent.setup()
      const mockCotacaoData = {
        itens: [
          {
            PEDIDO_COTACAO: 123,
            EMISSAO: '2024-01-01',
            PRO_CODIGO: 1001,
            PRO_DESCRICAO: 'Produto Teste',
            MAR_DESCRICAO: 'Marca Teste',
            REFERENCIA: 'REF001',
            UNIDADE: 'UN',
            QUANTIDADE: 10
          }
        ]
      }
      
      fetchMock
        .mockResolvedValueOnce(mockFetchResponse(mockCotacaoData))
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ message: 'Invalid data' })
        })
      
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Digite o pedido de cotação')
      await user.type(input, '123')
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Produto Teste')).toBeInTheDocument()
      })
      
      const createButton = screen.getByText('Criar Cotação')
      await user.click(createButton)
      
      await waitFor(() => {
        expect(screen.getByText('Erro: Invalid data')).toBeInTheDocument()
      })
    })

    it('handles malformed response data', async () => {
      const user = userEvent.setup()
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'structure' })
      })
      
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Digite o pedido de cotação')
      await user.type(input, '123')
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument()
      })
    })
  })

  describe('Data Validation', () => {
    it('validates pedido input format', async () => {
      const user = userEvent.setup()
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Digite o pedido de cotação')
      await user.type(input, '   ')
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      expect(screen.getByText('Informe o pedido de cotação.')).toBeInTheDocument()
    })

    it('handles numeric conversion for pedido', async () => {
      const user = userEvent.setup()
      const mockCotacaoData = { itens: [] }
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockCotacaoData))
      
      render(<PedidoPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Digite o pedido de cotação')
      await user.type(input, '123abc')
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('123abc'),
          expect.any(Object)
        )
      })
    })
  })
})