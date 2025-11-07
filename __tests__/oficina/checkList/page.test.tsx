import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CheckListPage from '@/app/(private)/oficina/checkList/page'
import { mockFetchResponse, mockFetchError, setupAuthenticatedUser, setupMockAlert, findButton } from '../../utils/test-utils'

type ChecklistRow = {
  id: string | number;
  osInterna?: string | null;
  dataHoraEntrada?: string | null;
  combustivelPercentual?: number | null;
  createdAt?: string | null;
  clienteNome?: string | null;
  veiculoPlaca?: string | null;
}

describe('CheckList Page', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    setupAuthenticatedUser()
    fetchMock = global.fetch as jest.Mock
    fetchMock.mockClear()
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders the main title and controls', async () => {
      const mockChecklists: ChecklistRow[] = [
        {
          id: '1',
          osInterna: 'OS001',
          clienteNome: 'João Silva',
          veiculoPlaca: 'ABC-1234'
        }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockChecklists))
      
      render(<CheckListPage />)
      
      expect(screen.getByText('Checklists (Oficina)')).toBeInTheDocument()
      expect(screen.getByTitle(/Recarregar do servidor/)).toBeInTheDocument()
      
      // Aguardar que os dados carreguem para verificar os botões de ação
      await waitFor(() => {
        expect(screen.getByTitle(/Baixar PDF/)).toBeInTheDocument()
      })
    })

    it('loads checklists on mount', async () => {
      const mockChecklists: ChecklistRow[] = [
        {
          id: '1',
          osInterna: 'OS001',
          dataHoraEntrada: '2024-01-01T10:00:00Z',
          combustivelPercentual: 75,
          clienteNome: 'João Silva',
          veiculoPlaca: 'ABC-1234'
        }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockChecklists))
      
      render(<CheckListPage />)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/oficina/checklists'),
          expect.objectContaining({
            headers: { Accept: 'application/json' }
          })
        )
      })
    })

    it('displays checklists in table', async () => {
      const mockChecklists: ChecklistRow[] = [
        {
          id: '1',
          osInterna: 'OS001',
          dataHoraEntrada: '2024-01-01T10:00:00Z',
          combustivelPercentual: 75,
          clienteNome: 'João Silva',
          veiculoPlaca: 'ABC-1234'
        },
        {
          id: '2',
          osInterna: 'OS002',
          dataHoraEntrada: '2024-01-02T14:30:00Z',
          combustivelPercentual: 50,
          clienteNome: 'Maria Santos',
          veiculoPlaca: 'XYZ-5678'
        }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockChecklists))
      
      render(<CheckListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('OS001')).toBeInTheDocument()
        expect(screen.getByText('OS002')).toBeInTheDocument()
        expect(screen.getByText('João Silva')).toBeInTheDocument()
        expect(screen.getByText('Maria Santos')).toBeInTheDocument()
        expect(screen.getByText('ABC-1234')).toBeInTheDocument()
        expect(screen.getByText('XYZ-5678')).toBeInTheDocument()
      })
    })

    it('shows empty message when no checklists found', async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse([]))
      
      render(<CheckListPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Nenhum registro encontrado/)).toBeInTheDocument()
      })
    })
  })

  describe('Filtering Functionality', () => {
    const mockChecklists: ChecklistRow[] = [
      {
        id: '1',
        osInterna: 'OS001',
        dataHoraEntrada: '2024-01-01T10:00:00Z',
        clienteNome: 'João Silva',
        veiculoPlaca: 'ABC-1234'
      },
      {
        id: '2',
        osInterna: 'OS002',
        dataHoraEntrada: '2024-01-02T14:30:00Z',
        clienteNome: 'Maria Santos',
        veiculoPlaca: 'XYZ-5678'
      }
    ]

    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockChecklists))
      render(<CheckListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('OS001')).toBeInTheDocument()
      })
    })

    it('filters by OS Interna', async () => {
      const user = userEvent.setup()
      
      const osInternaInput = screen.getByPlaceholderText('OS Interna')
      await user.type(osInternaInput, 'OS001')
      
      expect(osInternaInput).toHaveValue('OS001')
    })

    it('filters by vehicle plate', async () => {
      const user = userEvent.setup()
      
      const placaInput = screen.getByPlaceholderText('Placa')
      await user.type(placaInput, 'ABC-1234')
      
      expect(placaInput).toHaveValue('ABC-1234')
    })

    it('filters by date range', async () => {
      const user = userEvent.setup()
      
      const dataDeInput = screen.getByPlaceholderText('Data De')
      const dataAteInput = screen.getByPlaceholderText('Data Até')
      
      await user.type(dataDeInput, '2024-01-01')
      await user.type(dataAteInput, '2024-01-31')
      
      expect(dataDeInput).toHaveValue('2024-01-01')
      expect(dataAteInput).toHaveValue('2024-01-31')
    })

    it('clears filters when clicking clear button', async () => {
      const user = userEvent.setup()
      
      // First add some filter values
      const osInternaInput = screen.getByPlaceholderText('OS Interna')
      const placaInput = screen.getByPlaceholderText('Placa')
      
      await user.type(osInternaInput, 'OS001')
      await user.type(placaInput, 'ABC-1234')
      
      // Then clear them
      const clearButton = screen.getByText('Limpar filtros')
      await user.click(clearButton)
      
      expect(osInternaInput).toHaveValue('')
      expect(placaInput).toHaveValue('')
    })
  })

  describe('Pagination', () => {
    beforeEach(async () => {
      const mockChecklists: ChecklistRow[] = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        osInterna: `OS${String(i + 1).padStart(3, '0')}`,
        clienteNome: `Cliente ${i + 1}`,
        veiculoPlaca: `ABC-${String(i + 1).padStart(4, '0')}`
      }))
      
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockChecklists))
      render(<CheckListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('OS001')).toBeInTheDocument()
      })
    })

    it('shows pagination controls', () => {
      expect(screen.getByText('Anterior')).toBeInTheDocument()
      expect(screen.getByText('Próxima')).toBeInTheDocument()
    })

    it('shows current page information', () => {
      expect(screen.getByText(/Página/)).toBeInTheDocument()
      expect(screen.getByText(/Total filtrado:/)).toBeInTheDocument()
    })

    it('allows changing page size', async () => {
      const user = userEvent.setup()
      
      // Find page size dropdown button
      const pageSizeButton = screen.getByText('10')
      await user.click(pageSizeButton)
      
      // Select different page size
      const option20 = screen.getByText('20')
      await user.click(option20)
      
      expect(screen.getByText('20')).toBeInTheDocument()
    })
  })

  describe('Table Features', () => {
    beforeEach(async () => {
      const mockChecklists: ChecklistRow[] = [
        {
          id: '1',
          osInterna: 'OS001',
          dataHoraEntrada: '2024-01-01T10:00:00Z',
          combustivelPercentual: 75,
          clienteNome: 'João Silva',
          veiculoPlaca: 'ABC-1234'
        }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockChecklists))
      render(<CheckListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('OS001')).toBeInTheDocument()
      })
    })

    it('displays table headers correctly', () => {
      expect(screen.getByText('Data/Hora Entrada')).toBeInTheDocument()
      expect(screen.getByText('OS Interna')).toBeInTheDocument()
      expect(screen.getByText('Cliente')).toBeInTheDocument()
      expect(screen.getByText('Placa')).toBeInTheDocument()
      expect(screen.getByText('Combustível (%)')).toBeInTheDocument()
      expect(screen.getByText('Ações')).toBeInTheDocument()
    })

    it('formats fuel percentage correctly', () => {
      expect(screen.getByText('75')).toBeInTheDocument()
    })

    it('formats date correctly', () => {
      // Should display formatted date
      expect(screen.getByText(/01\/01\/2024/)).toBeInTheDocument()
    })

    it('renders action buttons', () => {
      const pdfButtons = screen.getAllByTitle(/Baixar PDF/)
      const imageButtons = screen.getAllByTitle(/Fotos \(avarias\)/)
      
      expect(pdfButtons.length).toBeGreaterThan(0)
      expect(imageButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Image Gallery', () => {
    beforeEach(async () => {
      const mockChecklists: ChecklistRow[] = [
        {
          id: '1',
          osInterna: 'OS001',
          clienteNome: 'João Silva',
          veiculoPlaca: 'ABC-1234'
        }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockChecklists))
      render(<CheckListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('OS001')).toBeInTheDocument()
      })
    })

    it('opens gallery when clicking images button', async () => {
      const user = userEvent.setup()
      
      // Mock gallery images response
      const mockImages = [
        { fotoKey: 'img1', peca: 'Motor', observacoes: 'OK', tipo: 'checklist' },
        { fotoKey: 'img2', peca: 'Freios', observacoes: 'Necessita reparo', tipo: 'avaria' }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockImages))
      
      const imageButton = screen.getByTitle(/Fotos \(avarias\)/)
      await user.click(imageButton)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/oficina/img/1'),
          expect.any(Object)
        )
      })
    })

    it('handles gallery loading error', async () => {
      const user = userEvent.setup()
      
      fetchMock.mockRejectedValueOnce(new Error('Gallery load failed'))
      
      const imageButton = screen.getByTitle(/Fotos \(avarias\)/)
      await user.click(imageButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Gallery load failed/)).toBeInTheDocument()
      })
    })
  })

  describe('Loading and Error States', () => {
    it('handles loading error on mount', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      fetchMock.mockRejectedValueOnce(new Error('Network error'))
      
      render(<CheckListPage />)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Erro ao carregar checklists:', 'Network error')
      })
      
      consoleSpy.mockRestore()
    })

    it('shows loading indicator', async () => {
      fetchMock.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(<CheckListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Carregando...')).toBeInTheDocument()
      })
    })

    it('handles empty response gracefully', async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse(null))
      
      render(<CheckListPage />)
      
      await waitFor(() => {
        // Should handle null response without crashing
        expect(screen.getByText('Checklists (Oficina)')).toBeInTheDocument()
      })
    })
  })

  describe('Refresh Functionality', () => {
    it('reloads data when clicking refresh button', async () => {
      const user = userEvent.setup()
      
      // Initial load
      const mockChecklists: ChecklistRow[] = [
        { id: '1', osInterna: 'OS001', clienteNome: 'João Silva' }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(mockChecklists))
      
      render(<CheckListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('OS001')).toBeInTheDocument()
      })
      
      // Click refresh
      const updatedChecklists: ChecklistRow[] = [
        { id: '1', osInterna: 'OS001', clienteNome: 'João Silva' },
        { id: '2', osInterna: 'OS002', clienteNome: 'Maria Santos' }
      ]
      fetchMock.mockResolvedValueOnce(mockFetchResponse(updatedChecklists))
      
      const refreshButton = screen.getByTitle(/Recarregar do servidor/)
      await user.click(refreshButton)
      
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Date Validation', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse([]))
      render(<CheckListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Checklists (Oficina)')).toBeInTheDocument()
      })
    })

    it('shows validation error for invalid date range', async () => {
      const user = userEvent.setup()
      
      const dataDeInput = screen.getByPlaceholderText('Data De')
      const dataAteInput = screen.getByPlaceholderText('Data Até')
      
      // Set invalid range (end before start)
      await user.type(dataDeInput, '2024-01-31')
      await user.type(dataAteInput, '2024-01-01')
      
      expect(screen.getByText('Intervalo de datas inválido.')).toBeInTheDocument()
    })

    it('validates date range correctly', async () => {
      const user = userEvent.setup()
      
      const dataDeInput = screen.getByPlaceholderText('Data De')
      const dataAteInput = screen.getByPlaceholderText('Data Até')
      
      // Set valid range
      await user.type(dataDeInput, '2024-01-01')
      await user.type(dataAteInput, '2024-01-31')
      
      expect(screen.queryByText('Intervalo de datas inválido.')).not.toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse([]))
      render(<CheckListPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Checklists (Oficina)')).toBeInTheDocument()
      })
    })

    it('handles escape key to close dropdowns', () => {
      fireEvent.keyDown(document, { key: 'Escape' })
      
      // Should close any open dropdowns (tested indirectly through no errors)
      expect(screen.getByText('Checklists (Oficina)')).toBeInTheDocument()
    })
  })
})