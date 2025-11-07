import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EntregasPage from '@/app/(private)/expedicao/entregas/page'
import { mockFetchResponse, mockFetchError, setupAuthenticatedUser } from '../../utils/test-utils'

interface Entrega {
  id: number;
  cliente: string;
  status: string;
  id_entregador: number;
  venda: string;
  criado_em: string;
  aceito_em: string;
  disponivel_para_entrega_em: string;
  saiu_para_entrega_em: string;
  finalizado_em: string;
  retorno_entregador_em: string;
  embalado_em: string;
}

// Mock XLSX module
jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}))

describe('Entregas Page', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    setupAuthenticatedUser()
    fetchMock = global.fetch as jest.Mock
    fetchMock.mockClear()
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders the main title and loading state', () => {
      fetchMock.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(<EntregasPage />)
      
      expect(screen.getByText('Controle de Entregas')).toBeInTheDocument()
      expect(screen.getByText('Carregando...')).toBeInTheDocument()
    })

    it('loads entregas on mount', async () => {
      const mockEntregas: Entrega[] = [
        {
          id: 1,
          cliente: 'Cliente Teste',
          status: 'finalizado',
          id_entregador: 18,
          venda: 'V001',
          criado_em: '2024-01-01T10:00:00Z',
          aceito_em: '2024-01-01T10:30:00Z',
          disponivel_para_entrega_em: '2024-01-01T11:00:00Z',
          saiu_para_entrega_em: '2024-01-01T14:00:00Z',
          finalizado_em: '2024-01-01T16:00:00Z',
          retorno_entregador_em: '2024-01-01T16:30:00Z',
          embalado_em: '2024-01-01T10:45:00Z'
        }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockEntregas))
      
      render(<EntregasPage />)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          'https://intranetbackend.acacessorios.local/expedicao/entregas'
        )
      })
    })

    it('displays entregas data after loading', async () => {
      const mockEntregas: Entrega[] = [
        {
          id: 1,
          cliente: 'Cliente Teste',
          status: 'finalizado',
          id_entregador: 18,
          venda: 'V001',
          criado_em: '2024-01-01T10:00:00Z',
          aceito_em: '2024-01-01T10:30:00Z',
          disponivel_para_entrega_em: '2024-01-01T11:00:00Z',
          saiu_para_entrega_em: '2024-01-01T14:00:00Z',
          finalizado_em: '2024-01-01T16:00:00Z',
          retorno_entregador_em: '2024-01-01T16:30:00Z',
          embalado_em: '2024-01-01T10:45:00Z'
        }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockEntregas))
      
      render(<EntregasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Cliente Teste')).toBeInTheDocument()
        expect(screen.getByText('V001')).toBeInTheDocument()
        expect(screen.getByText('ALEX SILVA E SILVA')).toBeInTheDocument() // Nome do entregador
      })
    })

    it('shows error message when loading fails', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))
      
      render(<EntregasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Erro: Network error')).toBeInTheDocument()
      })
    })
  })

  describe('KPIs Display', () => {
    const mockEntregas: Entrega[] = [
      {
        id: 1,
        cliente: 'Cliente 1',
        status: 'finalizado',
        id_entregador: 18,
        venda: 'V001',
        criado_em: '2024-01-01T10:00:00Z',
        aceito_em: '2024-01-01T10:30:00Z',
        disponivel_para_entrega_em: '2024-01-01T11:00:00Z',
        saiu_para_entrega_em: '2024-01-01T14:00:00Z',
        finalizado_em: '2024-01-01T16:00:00Z',
        retorno_entregador_em: '2024-01-01T16:30:00Z',
        embalado_em: '2024-01-01T10:45:00Z'
      },
      {
        id: 2,
        cliente: 'Cliente 2',
        status: 'finalizado',
        id_entregador: 31,
        venda: 'V002',
        criado_em: '2024-01-02T09:00:00Z',
        aceito_em: '2024-01-02T09:20:00Z',
        disponivel_para_entrega_em: '2024-01-02T10:00:00Z',
        saiu_para_entrega_em: '2024-01-02T13:00:00Z',
        finalizado_em: '2024-01-02T15:30:00Z',
        retorno_entregador_em: '2024-01-02T16:00:00Z',
        embalado_em: '2024-01-02T09:40:00Z'
      }
    ]

    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockEntregas))
      render(<EntregasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Cliente 1')).toBeInTheDocument()
      })
    })

    it('displays total entregas count', () => {
      expect(screen.getByText('Total de Entregas')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('displays average cycle time', () => {
      expect(screen.getByText('Tempo Médio de Ciclo')).toBeInTheDocument()
      // Should show some time value
      expect(screen.getByText(/h|m|s/)).toBeInTheDocument()
    })

    it('displays average route time', () => {
      expect(screen.getByText('Tempo Médio de Rota')).toBeInTheDocument()
      // Should show some time value
      expect(screen.getByText(/h|m|s/)).toBeInTheDocument()
    })
  })

  describe('Date Filtering', () => {
    const mockEntregas: Entrega[] = [
      {
        id: 1,
        cliente: 'Cliente Janeiro',
        status: 'finalizado',
        id_entregador: 18,
        venda: 'V001',
        criado_em: '2024-01-15T10:00:00Z',
        aceito_em: '2024-01-15T10:30:00Z',
        disponivel_para_entrega_em: '2024-01-15T11:00:00Z',
        saiu_para_entrega_em: '2024-01-15T14:00:00Z',
        finalizado_em: '2024-01-15T16:00:00Z',
        retorno_entregador_em: '2024-01-15T16:30:00Z',
        embalado_em: '2024-01-15T10:45:00Z'
      },
      {
        id: 2,
        cliente: 'Cliente Fevereiro',
        status: 'finalizado',
        id_entregador: 31,
        venda: 'V002',
        criado_em: '2024-02-15T09:00:00Z',
        aceito_em: '2024-02-15T09:20:00Z',
        disponivel_para_entrega_em: '2024-02-15T10:00:00Z',
        saiu_para_entrega_em: '2024-02-15T13:00:00Z',
        finalizado_em: '2024-02-15T15:30:00Z',
        retorno_entregador_em: '2024-02-15T16:00:00Z',
        embalado_em: '2024-02-15T09:40:00Z'
      }
    ]

    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockEntregas))
      render(<EntregasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Cliente Janeiro')).toBeInTheDocument()
        expect(screen.getByText('Cliente Fevereiro')).toBeInTheDocument()
      })
    })

    it('filters by start date', async () => {
      const user = userEvent.setup()
      
      const dataInicioInput = screen.getByLabelText('Data Início:')
      await user.type(dataInicioInput, '2024-02-01')
      
      // Should only show February entry
      expect(screen.queryByText('Cliente Janeiro')).not.toBeInTheDocument()
      expect(screen.getByText('Cliente Fevereiro')).toBeInTheDocument()
    })

    it('filters by end date', async () => {
      const user = userEvent.setup()
      
      const dataFimInput = screen.getByLabelText('Data Fim:')
      await user.type(dataFimInput, '2024-01-31')
      
      // Should only show January entry
      expect(screen.getByText('Cliente Janeiro')).toBeInTheDocument()
      expect(screen.queryByText('Cliente Fevereiro')).not.toBeInTheDocument()
    })

    it('filters by date range', async () => {
      const user = userEvent.setup()
      
      const dataInicioInput = screen.getByLabelText('Data Início:')
      const dataFimInput = screen.getByLabelText('Data Fim:')
      
      await user.type(dataInicioInput, '2024-01-01')
      await user.type(dataFimInput, '2024-01-31')
      
      // Should only show January entry
      expect(screen.getByText('Cliente Janeiro')).toBeInTheDocument()
      expect(screen.queryByText('Cliente Fevereiro')).not.toBeInTheDocument()
    })
  })

  describe('Data Processing and Display', () => {
    const mockEntregas: Entrega[] = [
      {
        id: 1,
        cliente: 'Cliente Teste',
        status: 'finalizado',
        id_entregador: 18,
        venda: 'V001',
        criado_em: '2024-01-01T10:00:00Z',
        aceito_em: '2024-01-01T10:30:00Z',
        disponivel_para_entrega_em: '2024-01-01T11:00:00Z',
        saiu_para_entrega_em: '2024-01-01T14:00:00Z',
        finalizado_em: '2024-01-01T16:00:00Z',
        retorno_entregador_em: '2024-01-01T16:30:00Z',
        embalado_em: '2024-01-01T10:45:00Z'
      }
    ]

    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockEntregas))
      render(<EntregasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Cliente Teste')).toBeInTheDocument()
      })
    })

    it('displays entregador name correctly', () => {
      expect(screen.getByText('ALEX SILVA E SILVA')).toBeInTheDocument()
    })

    it('shows unknown entregador for unmapped IDs', async () => {
      const mockWithUnknown: Entrega[] = [{
        ...mockEntregas[0],
        id_entregador: 999 // Unmapped ID
      }]
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockWithUnknown))
      render(<EntregasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Desconhecido')).toBeInTheDocument()
      })
    })

    it('displays time durations in correct format', () => {
      // Should display time values for different stages
      expect(screen.getByText(/m|s|h/)).toBeInTheDocument()
    })

    it('handles missing timestamps gracefully', async () => {
      const mockWithMissing: Entrega[] = [{
        ...mockEntregas[0],
        aceito_em: '', // Missing timestamp
        finalizado_em: ''
      }]
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockWithMissing))
      render(<EntregasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Cliente Teste')).toBeInTheDocument()
        // Should show 0s for missing durations
        expect(screen.getByText('0s')).toBeInTheDocument()
      })
    })
  })

  describe('Table Display', () => {
    beforeEach(async () => {
      const mockEntregas: Entrega[] = [
        {
          id: 1,
          cliente: 'Cliente Teste',
          status: 'finalizado',
          id_entregador: 18,
          venda: 'V001',
          criado_em: '2024-01-01T10:00:00Z',
          aceito_em: '2024-01-01T10:30:00Z',
          disponivel_para_entrega_em: '2024-01-01T11:00:00Z',
          saiu_para_entrega_em: '2024-01-01T14:00:00Z',
          finalizado_em: '2024-01-01T16:00:00Z',
          retorno_entregador_em: '2024-01-01T16:30:00Z',
          embalado_em: '2024-01-01T10:45:00Z'
        }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockEntregas))
      render(<EntregasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Cliente Teste')).toBeInTheDocument()
      })
    })

    it('displays table headers correctly', () => {
      expect(screen.getByText('Cliente')).toBeInTheDocument()
      expect(screen.getByText('Venda')).toBeInTheDocument()
      expect(screen.getByText('Entregador')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Separação')).toBeInTheDocument()
      expect(screen.getByText('Embalagem')).toBeInTheDocument()
      expect(screen.getByText('Rota')).toBeInTheDocument()
    })

    it('shows entrega details in table rows', () => {
      expect(screen.getByText('Cliente Teste')).toBeInTheDocument()
      expect(screen.getByText('V001')).toBeInTheDocument()
      expect(screen.getByText('ALEX SILVA E SILVA')).toBeInTheDocument()
      expect(screen.getByText('finalizado')).toBeInTheDocument()
    })
  })

  describe('Charts and Analytics', () => {
    beforeEach(async () => {
      const mockEntregas: Entrega[] = [
        {
          id: 1,
          cliente: 'Cliente 1',
          status: 'finalizado',
          id_entregador: 18,
          venda: 'V001',
          criado_em: '2024-01-01T10:00:00Z',
          aceito_em: '2024-01-01T10:30:00Z',
          disponivel_para_entrega_em: '2024-01-01T11:00:00Z',
          saiu_para_entrega_em: '2024-01-01T14:00:00Z',
          finalizado_em: '2024-01-01T16:00:00Z',
          retorno_entregador_em: '2024-01-01T16:30:00Z',
          embalado_em: '2024-01-01T10:45:00Z'
        },
        {
          id: 2,
          cliente: 'Cliente 2',
          status: 'finalizado',
          id_entregador: 31,
          venda: 'V002',
          criado_em: '2024-01-02T09:00:00Z',
          aceito_em: '2024-01-02T09:20:00Z',
          disponivel_para_entrega_em: '2024-01-02T10:00:00Z',
          saiu_para_entrega_em: '2024-01-02T13:00:00Z',
          finalizado_em: '2024-01-02T15:30:00Z',
          retorno_entregador_em: '2024-01-02T16:00:00Z',
          embalado_em: '2024-01-02T09:40:00Z'
        }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockEntregas))
      render(<EntregasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Cliente 1')).toBeInTheDocument()
      })
    })

    it('displays stage averages section', () => {
      expect(screen.getByText('Médias por Etapa')).toBeInTheDocument()
    })

    it('displays entregador averages section', () => {
      expect(screen.getByText('Médias por Entregador')).toBeInTheDocument()
    })

    it('shows both entregadores in averages', () => {
      expect(screen.getByText('ALEX SILVA E SILVA')).toBeInTheDocument()
      expect(screen.getByText('FRANCISCO DOS SANTOS')).toBeInTheDocument()
    })
  })

  describe('Export Functionality', () => {
    it('provides export to Excel functionality', async () => {
      const mockEntregas: Entrega[] = [
        {
          id: 1,
          cliente: 'Cliente Teste',
          status: 'finalizado',
          id_entregador: 18,
          venda: 'V001',
          criado_em: '2024-01-01T10:00:00Z',
          aceito_em: '2024-01-01T10:30:00Z',
          disponivel_para_entrega_em: '2024-01-01T11:00:00Z',
          saiu_para_entrega_em: '2024-01-01T14:00:00Z',
          finalizado_em: '2024-01-01T16:00:00Z',
          retorno_entregador_em: '2024-01-01T16:30:00Z',
          embalado_em: '2024-01-01T10:45:00Z'
        }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockEntregas))
      
      render(<EntregasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Cliente Teste')).toBeInTheDocument()
      })
      
      const exportButton = screen.getByText('Exportar Excel')
      expect(exportButton).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles HTTP error responses', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
      
      render(<EntregasPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Erro ao carregar dados/)).toBeInTheDocument()
      })
    })

    it('shows loading state while fetching', () => {
      fetchMock.mockImplementation(() => new Promise(() => {}))
      
      render(<EntregasPage />)
      
      expect(screen.getByText('Carregando...')).toBeInTheDocument()
    })

    it('handles empty data gracefully', async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse([]))
      
      render(<EntregasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument() // Total count should be 0
      })
    })
  })
})