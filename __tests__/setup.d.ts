import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveAttribute(attribute: string, value?: string): R
      toHaveValue(value: string | number): R
      toBeChecked(): R
      toHaveClass(className: string): R
      toHaveTextContent(text: string | RegExp): R
      toBeVisible(): R
      toBeDisabled(): R
      toBeEnabled(): R
      toHaveFocus(): R
    }
  }
}