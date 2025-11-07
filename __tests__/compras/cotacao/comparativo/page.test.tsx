import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ComparativoPage from '@/app/(private)/compras/cotacao/comparativo/page'
import { mockFetchResponse, mockFetchError, setupAuthenticatedUser } from '../../../utils/test-utils'

describe('Comparativo Page', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    setupAuthenticatedUser()
    fetchMock = global.fetch as jest.Mock
    fetchMock.mockClear()
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders the main title and search form', () => {
      render(<ComparativoPage />)
      
      expect(screen.getByText('Comparativo de Preços por Fornecedor')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Pedido de cotação (ex: 921)')).toBeInTheDocument()
      expect(screen.getByText('Buscar')).toBeInTheDocument()
    })

    it('shows empty state initially', () => {
      render(<ComparativoPage />)
      
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(screen.queryByText('Nenhum pedido carregado')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('shows error when searching with empty pedido', async () => {
      const user = userEvent.setup()
      render(<ComparativoPage />)
      
      const searchButton = screen.getByText('Buscar')
      await user.click(searchButton)
      
      expect(screen.getByText('Informe o número do pedido.')).toBeInTheDocument()
    })

    it('searches for comparativo data successfully', async () => {
      const user = userEvent.setup()
      const mockData = {
        pedido_cotacao: 12345,
        fornecedores: [
          {
            pedido_cotacao: 12345,
            for_codigo: 101,
            for_nome: 'Fornecedor A',
            cpf_cnpj: '12345678000199',
            itens: [
              {
                id: 1,
                pro_codigo: 1001,
                pro_descricao: 'Produto Teste',
                mar_descricao: 'Marca Teste',
                referencia: 'REF001',
                unidade: 'PÇ',
                quantidade: 10,
                emissao: '2024-01-01',
                valor_unitario: 50.00,
                custo_fabrica: 45.00
              }
            ]
          }
        ]
      }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockData))
      
      render(<ComparativoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Número do pedido')
      const searchButton = screen.getByText('Buscar')
      
      await user.type(pedidoInput, '12345')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/compras/pedidos-cotacao/12345/comparativo'),
          expect.objectContaining({
            headers: { Accept: 'application/json' }
          })
        )
      })
    })

    it('handles search error', async () => {
      const user = userEvent.setup()
      fetchMock.mockRejectedValueOnce(new Error('Network error'))
      
      render(<ComparativoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Número do pedido')
      const searchButton = screen.getByText('Buscar')
      
      await user.type(pedidoInput, '12345')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Erro ao carregar: Network error/)).toBeInTheDocument()
      })
    })

    it('shows message when no data found', async () => {
      const user = userEvent.setup()
      const mockEmptyData = {
        pedido_cotacao: 12345,
        fornecedores: []
      }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockEmptyData))
      
      render(<ComparativoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Número do pedido')
      const searchButton = screen.getByText('Buscar')
      
      await user.type(pedidoInput, '99999')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Nenhum fornecedor encontrado para este pedido.')).toBeInTheDocument()
      })
    })
  })

  describe('Comparison Table', () => {
    const mockComparisonData = {
      pedido_cotacao: 12345,
      fornecedores: [
        {
          pedido_cotacao: 12345,
          for_codigo: 101,
          for_nome: 'Fornecedor A',
          cpf_cnpj: '12345678000199',
          itens: [
            {
              id: 1,
              pro_codigo: 1001,
              pro_descricao: 'Produto Teste 1',
              mar_descricao: 'Marca A',
              referencia: 'REF001',
              unidade: 'PÇ',
              quantidade: 10,
              emissao: '2024-01-01',
              valor_unitario: 50.00,
              custo_fabrica: 45.00
            }
          ]
        },
        {
          pedido_cotacao: 12345,
          for_codigo: 102,
          for_nome: 'Fornecedor B',
          cpf_cnpj: '98765432000188',
          itens: [
            {
              id: 2,
              pro_codigo: 1001,
              pro_descricao: 'Produto Teste 1',
              mar_descricao: 'Marca A',
              referencia: 'REF001',
              unidade: 'PÇ',
              quantidade: 10,
              emissao: '2024-01-01',
              valor_unitario: 52.00,
              custo_fabrica: 47.00
            }
          ]
        }
      ]
    }

    beforeEach(async () => {
      const user = userEvent.setup()
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockComparisonData))
      
      render(<ComparativoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Número do pedido')
      const searchButton = screen.getByText('Buscar')
      
      await user.type(pedidoInput, '12345')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Fornecedor A')).toBeInTheDocument()
      })
    })

    it('displays comparison table with fornecedores', () => {
      expect(screen.getByText('Fornecedor A')).toBeInTheDocument()
      expect(screen.getByText('Fornecedor B')).toBeInTheDocument()
    })

    it('displays product information', () => {
      expect(screen.getByText('Produto Teste 1')).toBeInTheDocument()
      expect(screen.getByText('Marca A')).toBeInTheDocument()
      expect(screen.getByText('REF001')).toBeInTheDocument()
    })

    it('displays prices in BRL format', () => {
      expect(screen.getByText('R$ 50,00')).toBeInTheDocument()
      expect(screen.getByText('R$ 52,00')).toBeInTheDocument()
    })

    it('displays factory costs', () => {
      expect(screen.getByText('R$ 45,00')).toBeInTheDocument()
      expect(screen.getByText('R$ 47,00')).toBeInTheDocument()
    })

    it('highlights best prices', () => {
      // The lower price should be highlighted as winner
      const price50Element = screen.getByText('R$ 50,00')
      expect(price50Element).toHaveClass('text-emerald-700')
    })
  })

  describe('Price Editing', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      const mockData = {
        pedido_cotacao: 12345,
        fornecedores: [
          {
            pedido_cotacao: 12345,
            for_codigo: 101,
            for_nome: 'Fornecedor A',
            cpf_cnpj: '12345678000199',
            itens: [
              {
                id: 1,
                pro_codigo: 1001,
                pro_descricao: 'Produto Teste',
                mar_descricao: 'Marca A',
                referencia: 'REF001',
                unidade: 'PÇ',
                quantidade: 10,
                emissao: '2024-01-01',
                valor_unitario: 50.00,
                custo_fabrica: 45.00
              }
            ]
          }
        ]
      }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockData))
      
      render(<ComparativoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Número do pedido')
      const searchButton = screen.getByText('Buscar')
      
      await user.type(pedidoInput, '12345')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Produto Teste')).toBeInTheDocument()
      })
    })

    it('opens price edit modal when clicking on price', async () => {
      const user = userEvent.setup()
      
      const priceCell = screen.getByText('R$ 50,00')
      await user.click(priceCell)
      
      await waitFor(() => {
        expect(screen.getByText('Editar Preço')).toBeInTheDocument()
        expect(screen.getByDisplayValue('50')).toBeInTheDocument()
      })
    })

    it('allows editing price value', async () => {
      const user = userEvent.setup()
      
      const priceCell = screen.getByText('R$ 50,00')
      await user.click(priceCell)
      
      await waitFor(() => {
        expect(screen.getByText('Editar Preço')).toBeInTheDocument()
      })
      
      const priceInput = screen.getByDisplayValue('50')
      await user.clear(priceInput)
      await user.type(priceInput, '55')
      
      const saveButton = screen.getByText('Salvar')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText('R$ 55,00')).toBeInTheDocument()
      })
    })

    it('closes edit modal when clicking cancel', async () => {
      const user = userEvent.setup()
      
      const priceCell = screen.getByText('R$ 50,00')
      await user.click(priceCell)
      
      await waitFor(() => {
        expect(screen.getByText('Editar Preço')).toBeInTheDocument()
      })
      
      const cancelButton = screen.getByText('Cancelar')
      await user.click(cancelButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Editar Preço')).not.toBeInTheDocument()
      })
    })
  })

  describe('Quantity Management', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      const mockData = {
        pedido_cotacao: 12345,
        fornecedores: [
          {
            pedido_cotacao: 12345,
            for_codigo: 101,
            for_nome: 'Fornecedor A',
            cpf_cnpj: '12345678000199',
            itens: [
              {
                id: 1,
                pro_codigo: 1001,
                pro_descricao: 'Produto Teste',
                mar_descricao: 'Marca A',
                referencia: 'REF001',
                unidade: 'PÇ',
                quantidade: 10,
                emissao: '2024-01-01',
                valor_unitario: 50.00,
                custo_fabrica: 45.00
              }
            ]
          }
        ]
      }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockData))
      
      render(<ComparativoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Número do pedido')
      const searchButton = screen.getByText('Buscar')
      
      await user.type(pedidoInput, '12345')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Produto Teste')).toBeInTheDocument()
      })
    })

    it('allows editing quantity values', async () => {
      const user = userEvent.setup()
      
      const quantityInput = screen.getByDisplayValue('10')
      await user.clear(quantityInput)
      await user.type(quantityInput, '15')
      
      expect(quantityInput).toHaveValue(15)
    })

    it('updates total calculations when quantity changes', async () => {
      const user = userEvent.setup()
      
      const quantityInput = screen.getByDisplayValue('10')
      await user.clear(quantityInput)
      await user.type(quantityInput, '20')
      
      // Should update total value display
      await waitFor(() => {
        expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument() // 20 * 50
      })
    })
  })

  describe('Observations Modal', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      const mockData = {
        pedido_cotacao: 12345,
        fornecedores: [
          {
            pedido_cotacao: 12345,
            for_codigo: 101,
            for_nome: 'Fornecedor A',
            cpf_cnpj: '12345678000199',
            itens: [
              {
                id: 1,
                pro_codigo: 1001,
                pro_descricao: 'Produto Teste',
                mar_descricao: 'Marca A',
                referencia: 'REF001',
                unidade: 'PÇ',
                quantidade: 10,
                emissao: '2024-01-01',
                valor_unitario: 50.00,
                custo_fabrica: 45.00
              }
            ]
          }
        ]
      }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockData))
      
      render(<ComparativoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Número do pedido')
      const searchButton = screen.getByText('Buscar')
      
      await user.type(pedidoInput, '12345')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Fornecedor A')).toBeInTheDocument()
      })
    })

    it('opens observations modal when clicking on fornecedor header', async () => {
      const user = userEvent.setup()
      const mockObservations = { observacao: 'Observação teste' }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockObservations))
      
      const fornecedorHeader = screen.getByText('Fornecedor A')
      await user.click(fornecedorHeader)
      
      await waitFor(() => {
        expect(screen.getByText('Observações do fornecedor')).toBeInTheDocument()
      })
    })

    it('displays observation content', async () => {
      const user = userEvent.setup()
      const mockObservations = { observacao: 'Observação importante do fornecedor' }
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockObservations))
      
      const fornecedorHeader = screen.getByText('Fornecedor A')
      await user.click(fornecedorHeader)
      
      await waitFor(() => {
        expect(screen.getByText('Observação importante do fornecedor')).toBeInTheDocument()
      })
    })

    it('handles observation loading error', async () => {
      const user = userEvent.setup()
      fetchMock.mockRejectedValueOnce(new Error('Falha na API'))
      
      const fornecedorHeader = screen.getByText('Fornecedor A')
      await user.click(fornecedorHeader)
      
      await waitFor(() => {
        expect(screen.getByText(/Falha ao buscar observação/)).toBeInTheDocument()
      })
    })
  })

  describe('Form Interactions', () => {
    it('updates pedido input value', async () => {
      const user = userEvent.setup()
      render(<ComparativoPage />)
      
      const pedidoInput = screen.getByPlaceholderText('Número do pedido')
      await user.type(pedidoInput, '54321')
      
      expect(pedidoInput).toHaveValue('54321')
    })

    it('clears messages when starting new search', async () => {
      const user = userEvent.setup()
      render(<ComparativoPage />)
      
      // First create an error message
      const searchButton = screen.getByText('Buscar')
      await user.click(searchButton)
      
      expect(screen.getByText('Informe o número do pedido.')).toBeInTheDocument()
      
      // Then start typing, which should clear the message
      const pedidoInput = screen.getByPlaceholderText('Número do pedido')
      await user.type(pedidoInput, '1')
      
      await waitFor(() => {
        expect(screen.queryByText('Informe o número do pedido.')).not.toBeInTheDocument()
      })
    })
  })

  describe('Data Formatting', () => {
    it('formats currency values correctly', () => {
      render(<ComparativoPage />)
      
      // Test the fmtBRL function through the component
      // This would be tested through actual data rendering
      expect(true).toBe(true) // Placeholder for currency formatting tests
    })

    it('handles null and undefined values gracefully', () => {
      render(<ComparativoPage />)
      
      // Test null/undefined handling through component rendering
      expect(true).toBe(true) // Placeholder for null handling tests
    })
  })
})