import { render, screen } from '@testing-library/react'
import Home from '@/app/(private)/page'
import { setupAuthenticatedUser } from '../utils/test-utils'

describe('Home/Dashboard Page', () => {
  beforeEach(() => {
    setupAuthenticatedUser()
  })

  describe('Rendering', () => {
    it('renders the main title correctly', () => {
      render(<Home />)
      
      expect(screen.getByText('Intranet Ac Acessórios')).toBeInTheDocument()
    })

    it('applies correct CSS classes for layout', () => {
      render(<Home />)
      
      const container = screen.getByText('Intranet Ac Acessórios').closest('div')
      expect(container).toHaveClass('min-h-screen')
      expect(container).toHaveClass('flex')
      expect(container).toHaveClass('items-center')
      expect(container).toHaveClass('justify-center')
      expect(container).toHaveClass('bg-gray-100')
    })

    it('applies correct CSS classes for title', () => {
      render(<Home />)
      
      const title = screen.getByText('Intranet Ac Acessórios')
      expect(title).toHaveClass('text-4xl')
      expect(title).toHaveClass('font-bold')
      expect(title).toHaveClass('text-gray-800')
      expect(title).toHaveClass('text-center')
    })
  })

  describe('Accessibility', () => {
    it('renders title as a heading element', () => {
      render(<Home />)
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('Intranet Ac Acessórios')
    })

    it('has proper semantic structure', () => {
      render(<Home />)
      
      // Check that we have a proper heading structure
      const headings = screen.getAllByRole('heading')
      expect(headings).toHaveLength(1)
      expect(headings[0]).toHaveTextContent('Intranet Ac Acessórios')
    })
  })

  describe('Layout Structure', () => {
    it('renders with full screen height layout', () => {
      render(<Home />)
      
      const mainContainer = screen.getByText('Intranet Ac Acessórios').closest('div')
      expect(mainContainer).toHaveClass('min-h-screen')
    })

    it('centers content both horizontally and vertically', () => {
      render(<Home />)
      
      const mainContainer = screen.getByText('Intranet Ac Acessórios').closest('div')
      expect(mainContainer).toHaveClass('flex')
      expect(mainContainer).toHaveClass('items-center')
      expect(mainContainer).toHaveClass('justify-center')
    })

    it('has gray background', () => {
      render(<Home />)
      
      const mainContainer = screen.getByText('Intranet Ac Acessórios').closest('div')
      expect(mainContainer).toHaveClass('bg-gray-100')
    })
  })

  describe('Content', () => {
    it('displays the correct company name', () => {
      render(<Home />)
      
      expect(screen.getByText('Intranet Ac Acessórios')).toBeInTheDocument()
    })

    it('renders only the title, no additional content', () => {
      render(<Home />)
      
      const container = screen.getByText('Intranet Ac Acessórios').closest('div')
      expect(container?.children).toHaveLength(1)
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive text sizing', () => {
      render(<Home />)
      
      const title = screen.getByText('Intranet Ac Acessórios')
      expect(title).toHaveClass('text-4xl')
    })

    it('maintains centering on different screen sizes', () => {
      render(<Home />)
      
      const title = screen.getByText('Intranet Ac Acessórios')
      expect(title).toHaveClass('text-center')
    })
  })

  describe('Component Integration', () => {
    it('renders without errors', () => {
      expect(() => render(<Home />)).not.toThrow()
    })

    it('renders as a client component', () => {
      // Since this is marked as "use client", we ensure it renders properly
      const { container } = render(<Home />)
      expect(container.firstChild).toBeTruthy()
    })
  })

  describe('Visual Hierarchy', () => {
    it('has proper text color contrast', () => {
      render(<Home />)
      
      const title = screen.getByText('Intranet Ac Acessórios')
      expect(title).toHaveClass('text-gray-800')
    })

    it('uses bold font weight for emphasis', () => {
      render(<Home />)
      
      const title = screen.getByText('Intranet Ac Acessórios')
      expect(title).toHaveClass('font-bold')
    })
  })

  describe('Edge Cases', () => {
    it('handles re-rendering correctly', () => {
      const { rerender } = render(<Home />)
      
      expect(screen.getByText('Intranet Ac Acessórios')).toBeInTheDocument()
      
      rerender(<Home />)
      
      expect(screen.getByText('Intranet Ac Acessórios')).toBeInTheDocument()
    })

    it('maintains state after multiple renders', () => {
      const { rerender } = render(<Home />)
      
      const title = screen.getByText('Intranet Ac Acessórios')
      const initialClasses = title.className
      
      rerender(<Home />)
      
      const titleAfterRerender = screen.getByText('Intranet Ac Acessórios')
      expect(titleAfterRerender.className).toBe(initialClasses)
    })
  })
})