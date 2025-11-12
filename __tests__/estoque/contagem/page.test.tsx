import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ContagemPage from '@/app/(private)/estoque/contagem/page'
import { mockFetchResponse, mockFetchError, setupAuthenticatedUser } from '../../utils/test-utils'

interface ContagemItem {
  DATA: string;
  COD_PRODUTO: number;
  DESC_PRODUTO: string;
  MAR_DESCRICAO: string;
  REF_FABRICANTE: string;
  REF_FORNECEDOR: string;
  LOCALIZACAO: string | null;
  UNIDADE: string;
  QTDE_SAIDA: number;
  ESTOQUE: number;
  RESERVA: number;
}

interface CotacaoItem {
  PEDIDO_COTACAO: number;
  EMISSAO: string | null;
  PRO_CODIGO: number | string;
  PRO_DESCRICAO: string;
  MAR_DESCRICAO: string;
  REFERENCIA: string;
  UNIDADE: string;
  QUANTIDADE: number;
}

interface Usuario {
  id: string;
  nome: string;
  setor: string;
}

describe('Contagem Page', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    setupAuthenticatedUser()
    fetchMock = global.fetch as jest.Mock
    fetchMock.mockClear()
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders the main title', () => {
      render(<ContagemPage />)
      
      expect(screen.getByText('CONTROLE DE ESTOQUE')).toBeInTheDocument()
    })

    it('renders the search form for contagem', () => {
      render(<ContagemPage />)
      
      expect(screen.getByLabelText('Data Inicial:')).toBeInTheDocument()
      expect(screen.getByLabelText('Data Final:')).toBeInTheDocument()
      expect(screen.getByLabelText('Localização:')).toBeInTheDocument()
      expect(screen.getByLabelText('Prateleira:')).toBeInTheDocument()
      expect(screen.getByText('Buscar Itens')).toBeInTheDocument()
    })

    it('renders the cotacao creation section', () => {
      render(<ContagemPage />)
      
      expect(screen.getByText('CRIAR COTAÇÃO')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /adicionar cotação/i })).toBeInTheDocument()
    })

    it('initially hides the cotacao form', () => {
      render(<ContagemPage />)
      
      expect(screen.queryByPlaceholderText('Digite o pedido de cotação')).not.toBeInTheDocument()
    })
  })

  describe('Cotacao Form', () => {
    it('shows cotacao form when clicking add button', async () => {
      const user = userEvent.setup()
      render(<ContagemPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      expect(screen.getByPlaceholderText('Digite o pedido de cotação')).toBeInTheDocument()
      expect(screen.getByText('Buscar Cotação')).toBeInTheDocument()
    })

    it('hides cotacao form when clicking add button again', async () => {
      const user = userEvent.setup()
      render(<ContagemPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      await user.click(addButton)
      
      expect(screen.queryByPlaceholderText('Digite o pedido de cotação')).not.toBeInTheDocument()
    })

    it('searches for cotacao when form is submitted', async () => {
      const user = userEvent.setup()
      const mockCotacaoItems: CotacaoItem[] = [
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
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockCotacaoItems))
      
      render(<ContagemPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Digite o pedido de cotação')
      await user.type(input, '123')
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          'http://intranetbackend.acacessorios.local/compras/cotacao/123'
        )
      })
    })

    it('displays cotacao items after search', async () => {
      const user = userEvent.setup()
      const mockCotacaoItems: CotacaoItem[] = [
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
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockCotacaoItems))
      
      render(<ContagemPage />)
      
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
      })
    })

    it('shows error message when cotacao search fails', async () => {
      const user = userEvent.setup()
      fetchMock.mockRejectedValueOnce(new Error('Network error'))
      
      render(<ContagemPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Digite o pedido de cotação')
      await user.type(input, '123')
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Erro: Network error')).toBeInTheDocument()
      })
    })

    it('requires pedido to be filled before searching', async () => {
      const user = userEvent.setup()
      render(<ContagemPage />)
      
      const addButton = screen.getByRole('button', { name: /adicionar cotação/i })
      await user.click(addButton)
      
      const searchButton = screen.getByText('Buscar Cotação')
      await user.click(searchButton)
      
      expect(screen.getByText('Informe o pedido de cotação.')).toBeInTheDocument()
    })
  })

  describe('Contagem Search', () => {
    it('searches for contagem items with date filters', async () => {
      const user = userEvent.setup()
      const mockContagemItems: ContagemItem[] = [
        {
          DATA: '2024-01-01',
          COD_PRODUTO: 1001,
          DESC_PRODUTO: 'Produto Contagem',
          MAR_DESCRICAO: 'Marca Teste',
          REF_FABRICANTE: 'REF001',
          REF_FORNECEDOR: 'FORN001',
          LOCALIZACAO: 'A1301A01',
          UNIDADE: 'UN',
          QTDE_SAIDA: 5,
          ESTOQUE: 100,
          RESERVA: 10
        }
      ]
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockContagemItems))
      
      render(<ContagemPage />)
      
      const dataInicial = screen.getByLabelText('Data Inicial:')
      const dataFinal = screen.getByLabelText('Data Final:')
      
      await user.type(dataInicial, '2024-01-01')
      await user.type(dataFinal, '2024-01-31')
      
      const searchButton = screen.getByText('Buscar Itens')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('http://intranetbackend.acacessorios.local/estoque/contagem')
        )
      })
    })

    it('displays contagem items after search', async () => {
      const user = userEvent.setup()
      const mockContagemItems: ContagemItem[] = [
        {
          DATA: '2024-01-01',
          COD_PRODUTO: 1001,
          DESC_PRODUTO: 'Produto Contagem',
          MAR_DESCRICAO: 'Marca Teste',
          REF_FABRICANTE: 'REF001',
          REF_FORNECEDOR: 'FORN001',
          LOCALIZACAO: 'A1301A01',
          UNIDADE: 'UN',
          QTDE_SAIDA: 5,
          ESTOQUE: 100,
          RESERVA: 10
        }
      ]
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockContagemItems))
      
      render(<ContagemPage />)
      
      const searchButton = screen.getByText('Buscar Itens')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Produto Contagem')).toBeInTheDocument()
        expect(screen.getByText('Marca Teste')).toBeInTheDocument()
        expect(screen.getByText('A1301A01')).toBeInTheDocument()
      })
    })

    it('requires both dates to search', async () => {
      const user = userEvent.setup()
      render(<ContagemPage />)
      
      const searchButton = screen.getByText('Buscar Itens')
      await user.click(searchButton)
      
      expect(screen.getByText('Informe as datas inicial e final.')).toBeInTheDocument()
    })
  })

  describe('Location Filtering', () => {
    const mockContagemItems: ContagemItem[] = [
      {
        DATA: '2024-01-01',
        COD_PRODUTO: 1001,
        DESC_PRODUTO: 'Produto A',
        MAR_DESCRICAO: 'Marca',
        REF_FABRICANTE: 'REF001',
        REF_FORNECEDOR: 'FORN001',
        LOCALIZACAO: 'A1301A01',
        UNIDADE: 'UN',
        QTDE_SAIDA: 5,
        ESTOQUE: 100,
        RESERVA: 10
      },
      {
        DATA: '2024-01-01',
        COD_PRODUTO: 1002,
        DESC_PRODUTO: 'Produto B',
        MAR_DESCRICAO: 'Marca',
        REF_FABRICANTE: 'REF002',
        REF_FORNECEDOR: 'FORN002',
        LOCALIZACAO: 'B1501B01',
        UNIDADE: 'UN',
        QTDE_SAIDA: 3,
        ESTOQUE: 50,
        RESERVA: 5
      },
      {
        DATA: '2024-01-01',
        COD_PRODUTO: 1003,
        DESC_PRODUTO: 'Produto Box',
        MAR_DESCRICAO: 'Marca',
        REF_FABRICANTE: 'REF003',
        REF_FORNECEDOR: 'FORN003',
        LOCALIZACAO: 'BOX01',
        UNIDADE: 'UN',
        QTDE_SAIDA: 2,
        ESTOQUE: 25,
        RESERVA: 0
      }
    ]

    beforeEach(async () => {
      const user = userEvent.setup()
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockContagemItems))
      
      render(<ContagemPage />)
      
      const searchButton = screen.getByText('Buscar Itens')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Produto A')).toBeInTheDocument()
      })
    })

    it('filters by PISO_A location', async () => {
      const user = userEvent.setup()
      
      const localizacaoSelect = screen.getByLabelText('Localização:')
      await user.selectOptions(localizacaoSelect, 'PISO_A')
      
      expect(screen.getByText('Produto A')).toBeInTheDocument()
      expect(screen.queryByText('Produto B')).not.toBeInTheDocument()
      expect(screen.queryByText('Produto Box')).not.toBeInTheDocument()
    })

    it('filters by PISO_B location', async () => {
      const user = userEvent.setup()
      
      const localizacaoSelect = screen.getByLabelText('Localização:')
      await user.selectOptions(localizacaoSelect, 'PISO_B')
      
      expect(screen.queryByText('Produto A')).not.toBeInTheDocument()
      expect(screen.getByText('Produto B')).toBeInTheDocument()
      expect(screen.queryByText('Produto Box')).not.toBeInTheDocument()
    })

    it('filters by BOX location', async () => {
      const user = userEvent.setup()
      
      const localizacaoSelect = screen.getByLabelText('Localização:')
      await user.selectOptions(localizacaoSelect, 'BOX')
      
      expect(screen.queryByText('Produto A')).not.toBeInTheDocument()
      expect(screen.queryByText('Produto B')).not.toBeInTheDocument()
      expect(screen.getByText('Produto Box')).toBeInTheDocument()
    })

    it('filters by prateleira number', async () => {
      const user = userEvent.setup()
      
      const prateleiraInput = screen.getByLabelText('Prateleira:')
      await user.type(prateleiraInput, '13')
      
      // Should show only items from prateleira 13
      expect(screen.getByText('Produto A')).toBeInTheDocument()
      expect(screen.queryByText('Produto B')).not.toBeInTheDocument()
    })
  })

  describe('Item Selection', () => {
    const mockContagemItems: ContagemItem[] = [
      {
        DATA: '2024-01-01',
        COD_PRODUTO: 1001,
        DESC_PRODUTO: 'Produto 1',
        MAR_DESCRICAO: 'Marca',
        REF_FABRICANTE: 'REF001',
        REF_FORNECEDOR: 'FORN001',
        LOCALIZACAO: 'A1301A01',
        UNIDADE: 'UN',
        QTDE_SAIDA: 5,
        ESTOQUE: 100,
        RESERVA: 10
      },
      {
        DATA: '2024-01-01',
        COD_PRODUTO: 1002,
        DESC_PRODUTO: 'Produto 2',
        MAR_DESCRICAO: 'Marca',
        REF_FABRICANTE: 'REF002',
        REF_FORNECEDOR: 'FORN002',
        LOCALIZACAO: 'A1302A01',
        UNIDADE: 'UN',
        QTDE_SAIDA: 3,
        ESTOQUE: 50,
        RESERVA: 5
      }
    ]

    beforeEach(async () => {
      const user = userEvent.setup()
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockContagemItems))
      
      render(<ContagemPage />)
      
      const searchButton = screen.getByText('Buscar Itens')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Produto 1')).toBeInTheDocument()
      })
    })

    it('allows selecting individual items', async () => {
      const user = userEvent.setup()
      
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0]) // Assuming first checkbox is for first item
      
      // Should show selection in UI (this depends on implementation)
      expect(checkboxes[0]).toBeChecked()
    })

    it('allows selecting all items', async () => {
      const user = userEvent.setup()
      
      const selectAllButton = screen.getByText('Selecionar Todos')
      await user.click(selectAllButton)
      
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach((checkbox: HTMLElement) => {
        expect(checkbox).toBeChecked()
      })
    })

    it('allows deselecting all items', async () => {
      const user = userEvent.setup()
      
      const selectAllButton = screen.getByText('Selecionar Todos')
      await user.click(selectAllButton)
      
      const deselectAllButton = screen.getByText('Deselecionar Todos')
      await user.click(deselectAllButton)
      
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach((checkbox: HTMLElement) => {
        expect(checkbox).not.toBeChecked()
      })
    })
  })

  describe('User Assignment', () => {
    const mockUsuarios: Usuario[] = [
      { id: '1', nome: 'João Silva', setor: 'Estoque' },
      { id: '2', nome: 'Maria Santos', setor: 'Estoque' },
      { id: '3', nome: 'Pedro Lima', setor: 'Estoque' }
    ]

    beforeEach(() => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockUsuarios))
    })

    it('loads users for contagem assignment', async () => {
      render(<ContagemPage />)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          'http://intranetbackend.acacessorios.local/usuarios'
        )
      })
    })

    it('displays user selection dropdowns', async () => {
      render(<ContagemPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Contagem 1:')).toBeInTheDocument()
        expect(screen.getByLabelText('Contagem 2:')).toBeInTheDocument()
        expect(screen.getByLabelText('Contagem 3:')).toBeInTheDocument()
      })
    })

    it('allows selecting users for contagem', async () => {
      const user = userEvent.setup()
      render(<ContagemPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Contagem 1:')).toBeInTheDocument()
      })
      
      const contagem1Select = screen.getByLabelText('Contagem 1:')
      await user.selectOptions(contagem1Select, '1')
      
      expect(contagem1Select).toHaveValue('1')
    })
  })

  describe('Contagem Submission', () => {
    it('shows error when no items are selected', async () => {
      const user = userEvent.setup()
      render(<ContagemPage />)
      
      const salvarButton = screen.getByText('Salvar Contagens')
      await user.click(salvarButton)
      
      expect(screen.getByText('Selecione pelo menos um produto para criar as contagens.')).toBeInTheDocument()
    })

    it('submits contagem with selected items and users', async () => {
      const user = userEvent.setup()
      const mockContagemItems: ContagemItem[] = [
        {
          DATA: '2024-01-01',
          COD_PRODUTO: 1001,
          DESC_PRODUTO: 'Produto 1',
          MAR_DESCRICAO: 'Marca',
          REF_FABRICANTE: 'REF001',
          REF_FORNECEDOR: 'FORN001',
          LOCALIZACAO: 'A1301A01',
          UNIDADE: 'UN',
          QTDE_SAIDA: 5,
          ESTOQUE: 100,
          RESERVA: 10
        }
      ]
      
      const mockUsuarios: Usuario[] = [
        { id: '1', nome: 'João Silva', setor: 'Estoque' }
      ]
      
      fetchMock
        .mockResolvedValueOnce(mockFetchResponse(mockUsuarios)) // Load users
        .mockResolvedValueOnce(mockFetchResponse(mockContagemItems)) // Load items
        .mockResolvedValueOnce(mockFetchResponse({})) // Submit contagem
      
      render(<ContagemPage />)
      
      // Load items
      const searchButton = screen.getByText('Buscar Itens')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Produto 1')).toBeInTheDocument()
      })
      
      // Select item
      const checkbox = screen.getAllByRole('checkbox')[0]
      await user.click(checkbox)
      
      // Select user for contagem 1
      const contagem1Select = screen.getByLabelText('Contagem 1:')
      await user.selectOptions(contagem1Select, '1')
      
      // Submit
      const salvarButton = screen.getByText('Salvar Contagens')
      await user.click(salvarButton)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          'http://intranetbackend.acacessorios.local/estoque/contagem',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
        )
      })
    })
  })

  describe('Data Display', () => {
    it('displays item information in table format', async () => {
      const user = userEvent.setup()
      const mockContagemItems: ContagemItem[] = [
        {
          DATA: '2024-01-01',
          COD_PRODUTO: 1001,
          DESC_PRODUTO: 'Produto Teste',
          MAR_DESCRICAO: 'Marca Teste',
          REF_FABRICANTE: 'REF001',
          REF_FORNECEDOR: 'FORN001',
          LOCALIZACAO: 'A1301A01',
          UNIDADE: 'UN',
          QTDE_SAIDA: 5,
          ESTOQUE: 100,
          RESERVA: 10
        }
      ]
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockContagemItems))
      
      render(<ContagemPage />)
      
      const searchButton = screen.getByText('Buscar Itens')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Código')).toBeInTheDocument()
        expect(screen.getByText('Descrição')).toBeInTheDocument()
        expect(screen.getByText('Localização')).toBeInTheDocument()
        expect(screen.getByText('Estoque')).toBeInTheDocument()
        expect(screen.getByText('Reserva')).toBeInTheDocument()
        
        expect(screen.getByText('1001')).toBeInTheDocument()
        expect(screen.getByText('Produto Teste')).toBeInTheDocument()
        expect(screen.getByText('A1301A01')).toBeInTheDocument()
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
      })
    })

    it('shows loading state during search', () => {
      fetchMock.mockImplementation(() => new Promise(() => {}))
      
      render(<ContagemPage />)
      
      const searchButton = screen.getByText('Buscar Itens')
      fireEvent.click(searchButton)
      
      expect(screen.getByText('Carregando...')).toBeInTheDocument()
    })

    it('shows empty state when no items found', async () => {
      const user = userEvent.setup()
      fetchMock.mockResolvedValueOnce(mockFetchResponse([]))
      
      render(<ContagemPage />)
      
      const searchButton = screen.getByText('Buscar Itens')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const user = userEvent.setup()
      fetchMock.mockRejectedValueOnce(new Error('Network error'))
      
      render(<ContagemPage />)
      
      const searchButton = screen.getByText('Buscar Itens')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Erro: Network error')).toBeInTheDocument()
      })
    })

    it('handles HTTP error responses', async () => {
      const user = userEvent.setup()
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
      
      render(<ContagemPage />)
      
      const searchButton = screen.getByText('Buscar Itens')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Erro ao carregar dados/)).toBeInTheDocument()
      })
    })
  })
})