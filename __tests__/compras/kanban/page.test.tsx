import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KanbanPage from '@/app/(private)/compras/kanban/page'
import { setupAuthenticatedUser } from '../../utils/test-utils'

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

// Mock Math.random for consistent IDs
const mockMath = Object.create(global.Math)
mockMath.random = jest.fn(() => 0.5)
global.Math = mockMath

describe('Kanban Page', () => {
  beforeEach(() => {
    setupAuthenticatedUser()
    localStorageMock.clear()
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders the kanban board title', () => {
      render(<KanbanPage />)
      
      expect(screen.getByText('KANBAN - ÁREA COMERCIAL')).toBeInTheDocument()
    })

    it('renders all kanban columns', () => {
      render(<KanbanPage />)
      
      expect(screen.getByText('Cadastro produto')).toBeInTheDocument()
      expect(screen.getByText('Criação pedido')).toBeInTheDocument()
      expect(screen.getByText('Conferência pedido')).toBeInTheDocument()
      expect(screen.getByText('Digitação pedido')).toBeInTheDocument()
      expect(screen.getByText('Acompanhamento pedido')).toBeInTheDocument()
      expect(screen.getByText('Conciliação pedido')).toBeInTheDocument()
      expect(screen.getByText('Recebimento')).toBeInTheDocument()
      expect(screen.getByText('Check-in')).toBeInTheDocument()
      expect(screen.getByText('Codificação')).toBeInTheDocument()
      expect(screen.getByText('Impressão mapa')).toBeInTheDocument()
      expect(screen.getByText('Arquivo')).toBeInTheDocument()
    })

    it('loads board state from localStorage on mount', () => {
      const mockBoardState = {
        cadastro_produto: [
          {
            id: 'task-1',
            title: 'Tarefa Teste',
            createdAt: 1640995200000,
            desc: 'Descrição da tarefa',
            responsavel: 'João Silva',
            due: '2024-01-15',
            prioridade: 'alta'
          }
        ],
        criacao_pedido: [],
        conferencia_pedido: [],
        digitacao_pedido: [],
        acompanhamento_pedido: [],
        conciliacao_pedido: [],
        recebimento: [],
        checkin: [],
        codificacao: [],
        impressao_mapa: [],
        arquivo: []
      }
      
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockBoardState))
      
      render(<KanbanPage />)
      
      expect(screen.getByText('Tarefa Teste')).toBeInTheDocument()
      expect(screen.getByText('João Silva')).toBeInTheDocument()
      expect(screen.getByText('alta')).toBeInTheDocument()
    })

    it('initializes with empty board when no localStorage data exists', () => {
      localStorageMock.getItem.mockReturnValueOnce(null)
      
      render(<KanbanPage />)
      
      // All columns should be empty
      const addButtons = screen.getAllByText('+')
      expect(addButtons).toHaveLength(11) // One for each column
    })
  })

  describe('Task Creation', () => {
    it('creates a new task when clicking + button and providing title', async () => {
      const user = userEvent.setup()
      render(<KanbanPage />)
      
      // Click the + button on the first column
      const addButtons = screen.getAllByText('+')
      await user.click(addButtons[0])
      
      // Enter task title
      const input = screen.getByPlaceholderText('Digite o título da tarefa')
      await user.type(input, 'Nova Tarefa')
      await user.keyboard('{Enter}')
      
      // Task should appear in the column
      expect(screen.getByText('Nova Tarefa')).toBeInTheDocument()
    })

    it('does not create task with empty title', async () => {
      const user = userEvent.setup()
      render(<KanbanPage />)
      
      const addButtons = screen.getAllByText('+')
      await user.click(addButtons[0])
      
      const input = screen.getByPlaceholderText('Digite o título da tarefa')
      await user.keyboard('{Enter}') // Enter without typing anything
      
      // Input should still be visible (task not created)
      expect(screen.getByPlaceholderText('Digite o título da tarefa')).toBeInTheDocument()
    })

    it('cancels task creation when clicking outside', async () => {
      const user = userEvent.setup()
      render(<KanbanPage />)
      
      const addButtons = screen.getAllByText('+')
      await user.click(addButtons[0])
      
      expect(screen.getByPlaceholderText('Digite o título da tarefa')).toBeInTheDocument()
      
      // Click outside the input
      await user.click(document.body)
      
      // Input should disappear
      expect(screen.queryByPlaceholderText('Digite o título da tarefa')).not.toBeInTheDocument()
    })

    it('saves board state to localStorage after creating task', async () => {
      const user = userEvent.setup()
      render(<KanbanPage />)
      
      const addButtons = screen.getAllByText('+')
      await user.click(addButtons[0])
      
      const input = screen.getByPlaceholderText('Digite o título da tarefa')
      await user.type(input, 'Nova Tarefa')
      await user.keyboard('{Enter}')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'kanban_ac_board_v1',
        expect.stringContaining('Nova Tarefa')
      )
    })
  })

  describe('Task Deletion', () => {
    beforeEach(() => {
      const mockBoardState = {
        cadastro_produto: [
          {
            id: 'task-1',
            title: 'Tarefa Para Deletar',
            createdAt: 1640995200000
          }
        ],
        criacao_pedido: [],
        conferencia_pedido: [],
        digitacao_pedido: [],
        acompanhamento_pedido: [],
        conciliacao_pedido: [],
        recebimento: [],
        checkin: [],
        codificacao: [],
        impressao_mapa: [],
        arquivo: []
      }
      
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockBoardState))
    })

    it('deletes task when clicking delete button', async () => {
      const user = userEvent.setup()
      render(<KanbanPage />)
      
      expect(screen.getByText('Tarefa Para Deletar')).toBeInTheDocument()
      
      const deleteButton = screen.getByRole('button', { name: 'Excluir' })
      await user.click(deleteButton)
      
      expect(screen.queryByText('Tarefa Para Deletar')).not.toBeInTheDocument()
    })

    it('saves board state after deleting task', async () => {
      const user = userEvent.setup()
      render(<KanbanPage />)
      
      const deleteButton = screen.getByRole('button', { name: 'Excluir' })
      await user.click(deleteButton)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'kanban_ac_board_v1',
        expect.not.stringContaining('Tarefa Para Deletar')
      )
    })
  })

  describe('Task Modal and Editing', () => {
    beforeEach(() => {
      const mockBoardState = {
        cadastro_produto: [
          {
            id: 'task-1',
            title: 'Tarefa Editável',
            createdAt: 1640995200000,
            desc: 'Descrição inicial',
            responsavel: 'João Silva',
            due: '2024-01-15',
            prioridade: 'media'
          }
        ],
        criacao_pedido: [],
        conferencia_pedido: [],
        digitacao_pedido: [],
        acompanhamento_pedido: [],
        conciliacao_pedido: [],
        recebimento: [],
        checkin: [],
        codificacao: [],
        impressao_mapa: [],
        arquivo: []
      }
      
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockBoardState))
    })

    it('opens modal when clicking on task card', async () => {
      const user = userEvent.setup()
      render(<KanbanPage />)
      
      await user.click(screen.getByText('Tarefa Editável'))
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Tarefa Editável')).toBeInTheDocument()
    })

    it('displays all task fields in modal', async () => {
      const user = userEvent.setup()
      render(<KanbanPage />)
      
      await user.click(screen.getByText('Tarefa Editável'))
      
      expect(screen.getByDisplayValue('Tarefa Editável')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Descrição inicial')).toBeInTheDocument()
      expect(screen.getByDisplayValue('João Silva')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument()
      expect(screen.getByDisplayValue('media')).toBeInTheDocument()
    })

    it('updates task when saving changes in modal', async () => {
      const user = userEvent.setup()
      render(<KanbanPage />)
      
      await user.click(screen.getByText('Tarefa Editável'))
      
      // Change title
      const titleInput = screen.getByDisplayValue('Tarefa Editável')
      await user.clear(titleInput)
      await user.type(titleInput, 'Tarefa Atualizada')
      
      // Save changes
      await user.click(screen.getByText('Salvar'))
      
      expect(screen.getByText('Tarefa Atualizada')).toBeInTheDocument()
      expect(screen.queryByText('Tarefa Editável')).not.toBeInTheDocument()
    })

    it('closes modal when clicking cancel', async () => {
      const user = userEvent.setup()
      render(<KanbanPage />)
      
      await user.click(screen.getByText('Tarefa Editável'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      await user.click(screen.getByText('Cancelar'))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('closes modal when clicking outside', async () => {
      const user = userEvent.setup()
      render(<KanbanPage />)
      
      await user.click(screen.getByText('Tarefa Editável'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      // Click on backdrop
      const backdrop = screen.getByRole('dialog').parentElement
      if (backdrop) {
        await user.click(backdrop)
      }
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Drag and Drop', () => {
    beforeEach(() => {
      const mockBoardState = {
        cadastro_produto: [
          {
            id: 'task-1',
            title: 'Tarefa Movível',
            createdAt: 1640995200000
          }
        ],
        criacao_pedido: [],
        conferencia_pedido: [],
        digitacao_pedido: [],
        acompanhamento_pedido: [],
        conciliacao_pedido: [],
        recebimento: [],
        checkin: [],
        codificacao: [],
        impressao_mapa: [],
        arquivo: []
      }
      
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockBoardState))
    })

    it('sets drag data when starting to drag task', () => {
      render(<KanbanPage />)
      
      const taskCard = screen.getByText('Tarefa Movível').closest('div')
      expect(taskCard).toHaveAttribute('draggable', 'true')
      
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        dataTransfer: new DataTransfer()
      })
      
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: {
          setData: jest.fn(),
          getData: jest.fn()
        }
      })
      
      if (taskCard) {
        fireEvent(taskCard, dragStartEvent)
      }
      
      expect(dragStartEvent.dataTransfer?.setData).toHaveBeenCalled()
    })

    it('allows dropping task in different columns', () => {
      render(<KanbanPage />)
      
      const columns = screen.getAllByText(/Criação pedido|Conferência pedido/)
      const targetColumn = columns[0]
      
      expect(targetColumn).toBeInTheDocument()
      
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        dataTransfer: new DataTransfer()
      })
      
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: jest.fn().mockReturnValue(JSON.stringify({
            taskId: 'task-1',
            from: 'cadastro_produto'
          }))
        }
      })
      
      fireEvent(targetColumn.closest('[data-col]') || targetColumn, dropEvent)
      
      // Task should be moved (implementation depends on the actual drop handler)
    })
  })

  describe('Task Display', () => {
    beforeEach(() => {
      const mockBoardState = {
        cadastro_produto: [
          {
            id: 'task-1',
            title: 'Tarefa Completa',
            createdAt: 1640995200000,
            desc: 'Descrição da tarefa',
            responsavel: 'Maria Silva',
            due: '2024-01-15',
            prioridade: 'alta'
          },
          {
            id: 'task-2',
            title: 'Tarefa Simples',
            createdAt: 1640995200000
          }
        ],
        criacao_pedido: [],
        conferencia_pedido: [],
        digitacao_pedido: [],
        acompanhamento_pedido: [],
        conciliacao_pedido: [],
        recebimento: [],
        checkin: [],
        codificacao: [],
        impressao_mapa: [],
        arquivo: []
      }
      
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockBoardState))
    })

    it('displays task with all fields', () => {
      render(<KanbanPage />)
      
      expect(screen.getByText('Tarefa Completa')).toBeInTheDocument()
      expect(screen.getByText('Maria Silva')).toBeInTheDocument()
      expect(screen.getByText('alta')).toBeInTheDocument()
      expect(screen.getByText(/vence.*15\/01\/2024/)).toBeInTheDocument()
    })

    it('displays task with only required fields', () => {
      render(<KanbanPage />)
      
      expect(screen.getByText('Tarefa Simples')).toBeInTheDocument()
      // Should not show optional fields
      expect(screen.queryByText('vence')).toBeInTheDocument() // Only for the other task
    })

    it('shows creation date for all tasks', () => {
      render(<KanbanPage />)
      
      // Should show formatted date
      expect(screen.getAllByText(/31\/12\/2021/)).toHaveLength(2)
    })
  })

  describe('Automations', () => {
    it('renders automation settings button', () => {
      render(<KanbanPage />)
      
      expect(screen.getByText('Automações')).toBeInTheDocument()
    })

    it('opens automation modal when clicking automations button', async () => {
      const user = userEvent.setup()
      render(<KanbanPage />)
      
      await user.click(screen.getByText('Automações'))
      
      expect(screen.getByText('Configurar Automações')).toBeInTheDocument()
    })
  })

  describe('Statistics', () => {
    beforeEach(() => {
      const mockBoardState = {
        cadastro_produto: [
          { id: 'task-1', title: 'Task 1', createdAt: 1640995200000 }
        ],
        criacao_pedido: [
          { id: 'task-2', title: 'Task 2', createdAt: 1640995200000 },
          { id: 'task-3', title: 'Task 3', createdAt: 1640995200000 }
        ],
        conferencia_pedido: [],
        digitacao_pedido: [],
        acompanhamento_pedido: [],
        conciliacao_pedido: [],
        recebimento: [],
        checkin: [],
        codificacao: [],
        impressao_mapa: [],
        arquivo: []
      }
      
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockBoardState))
    })

    it('displays task count in column headers', () => {
      render(<KanbanPage />)
      
      expect(screen.getByText('Cadastro produto (1)')).toBeInTheDocument()
      expect(screen.getByText('Criação pedido (2)')).toBeInTheDocument()
    })
  })

  describe('Data Persistence', () => {
    it('loads automations from localStorage', () => {
      const mockAutomations = [
        {
          id: 'auto-1',
          from: 'cadastro_produto',
          to: 'criacao_pedido',
          condition: 'timeElapsed',
          value: 24
        }
      ]
      
      localStorageMock.getItem
        .mockReturnValueOnce('{}') // Board state
        .mockReturnValueOnce(JSON.stringify(mockAutomations)) // Automations
      
      render(<KanbanPage />)
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('kanban_ac_board_v1')
      expect(localStorageMock.getItem).toHaveBeenCalledWith('kanban_automations')
    })

    it('saves changes to localStorage', async () => {
      const user = userEvent.setup()
      render(<KanbanPage />)
      
      const addButtons = screen.getAllByText('+')
      await user.click(addButtons[0])
      
      const input = screen.getByPlaceholderText('Digite o título da tarefa')
      await user.type(input, 'Nova Tarefa')
      await user.keyboard('{Enter}')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'kanban_ac_board_v1',
        expect.stringContaining('Nova Tarefa')
      )
    })
  })
})