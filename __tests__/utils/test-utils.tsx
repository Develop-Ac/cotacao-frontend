import { render, screen } from '@testing-library/react'
import { ReactElement } from 'react'

// Custom render function that includes common providers
export function renderWithProviders(ui: ReactElement, options = {}) {
  // You can add providers here if needed in the future
  return render(ui, {
    // wrapper: ({ children }) => <Provider>{children}</Provider>,
    ...options,
  })
}

// Mock fetch responses
export const mockFetchResponse = (data: any, ok = true, status = 200) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response)
}

// Mock fetch with error
export const mockFetchError = (message = 'Network error') => {
  return Promise.reject(new Error(message))
}

// Setup authenticated user in localStorage
export const setupAuthenticatedUser = () => {
  const userData = {
    id: 1,
    nome: 'Test User',
    codigo: 'test.user',
    setor: 'TI',
    permissions: {
      compras: true,
      estoque: true,
      expedicao: true,
      oficina: true,
      usuario: true
    }
  }
  
  localStorage.setItem('authToken', 'mock-token')
  localStorage.setItem('userData', JSON.stringify(userData))
  return userData
}

// Mock window.alert utility
export const setupMockAlert = () => {
  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
  return alertSpy
}

// Find element by test id or fallback to closest button
export const findButton = (screen: any, testId: string, fallbackText?: string) => {
  try {
    const element = screen.getByTestId(testId)
    return element.closest('button') || element
  } catch {
    if (fallbackText) {
      try {
        return screen.getByText(fallbackText)
      } catch {
        return screen.getByRole('button', { name: new RegExp(fallbackText, 'i') })
      }
    }
    throw new Error(`Could not find button with testId: ${testId}`)
  }
}

// Wait for element to appear with timeout
export const waitForElement = async (screen: any, text: string | RegExp, timeout = 3000) => {
  const { waitFor } = await import('@testing-library/react')
  return waitFor(() => {
    if (typeof text === 'string') {
      return screen.getByText(text)
    }
    return screen.getByText(text)
  }, { timeout })
}

// Common test utilities
export const waitForLoadingToFinish = () => {
  return screen.findByText(/carregando/i, {}, { timeout: 3000 }).then(() => {
    // Wait for loading to disappear
    return new Promise(resolve => setTimeout(resolve, 100))
  }).catch(() => {
    // Loading text might not appear if component loads quickly
  })
}

// Clean up mocks after each test
export const cleanupMocks = () => {
  jest.clearAllMocks()
  localStorage.clear()
  if (global.fetch) {
    (global.fetch as jest.Mock).mockClear()
  }
}

// Mock user data generator
export const createMockUser = (overrides = {}) => ({
  id: 1,
  nome: 'Test User',
  codigo: 'test.user',
  setor: 'TI',
  ...overrides
})