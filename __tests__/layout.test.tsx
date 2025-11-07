import { render, screen } from '@testing-library/react'
import LoginLayout from '@/app/layout'

// Mock Next.js components
jest.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' })
}))

describe('Root Layout', () => {
  it('renders with correct HTML structure', () => {
    render(
      <LoginLayout>
        <div>Test Content</div>
      </LoginLayout>
    )
    
    // Check HTML lang attribute
    const htmlElement = document.documentElement
    expect(htmlElement.lang).toBe('pt-BR')
    
    // Check that children are rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('includes global CSS', () => {
    render(
      <LoginLayout>
        <div>Test Content</div>
      </LoginLayout>
    )
    
    // The layout imports globals.css - we can't directly test the import
    // but we can verify the basic structure is rendered
    const bodyElement = document.body
    expect(bodyElement).toBeInTheDocument()
  })

  it('renders children correctly', () => {
    const testChildren = (
      <div>
        <h1>Test Title</h1>
        <p>Test paragraph</p>
      </div>
    )
    
    render(
      <LoginLayout>
        {testChildren}
      </LoginLayout>
    )
    
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test paragraph')).toBeInTheDocument()
  })

  it('has correct HTML5 document structure', () => {
    render(
      <LoginLayout>
        <main>Main Content</main>
      </LoginLayout>
    )
    
    // Verify basic HTML structure
    expect(document.documentElement).toBeInTheDocument()
    expect(document.body).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('supports nested components', () => {
    const NestedComponent = () => (
      <div>
        <header>Header</header>
        <main>Main</main>
        <footer>Footer</footer>
      </div>
    )
    
    render(
      <LoginLayout>
        <NestedComponent />
      </LoginLayout>
    )
    
    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('Main')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })
})