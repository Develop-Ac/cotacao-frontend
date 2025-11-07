import '@testing-library/jest-dom'

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock react-icons
jest.mock('react-icons/fa', () => ({
  FaPlusSquare: () => <div data-testid="fa-plus-square" />,
  FaTrash: () => <div data-testid="fa-trash" />,
  FaEdit: () => <div data-testid="fa-edit" />,
  FaFilePdf: () => <div data-testid="fa-file-pdf" />,
  FaSync: () => <div data-testid="fa-sync" />,
  FaListUl: () => <div data-testid="fa-list-ul" />,
  FaCaretDown: () => <div data-testid="fa-caret-down" />,
  FaFilter: () => <div data-testid="fa-filter" />,
  FaImages: () => <div data-testid="fa-images" />,
  FaTimes: () => <div data-testid="fa-times" />,
  FaChevronLeft: () => <div data-testid="fa-chevron-left" />,
  FaChevronRight: () => <div data-testid="fa-chevron-right" />,
  FaDownload: () => <div data-testid="fa-download" />,
}))

jest.mock('react-icons/md', () => ({
  MdOutlineNotificationsNone: () => <div data-testid="md-notifications" />,
  MdFullscreen: () => <div data-testid="md-fullscreen" />,
  MdPowerSettingsNew: () => <div data-testid="md-power" />,
  MdMenu: () => <div data-testid="md-menu" />,
}))

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(() => null),
    removeItem: jest.fn(() => null),
    clear: jest.fn(() => null),
  },
  writable: true,
})

// Mock fetch
global.fetch = jest.fn()

// Mock window.alert
window.alert = jest.fn()

// Mock window.confirm
window.confirm = jest.fn()

// Setup default user data for tests
beforeEach(() => {
  localStorage.getItem.mockImplementation((key) => {
    if (key === 'userData') {
      return JSON.stringify({
        id: 1,
        nome: 'Test User',
        setor: 'TI',
        email: 'test@example.com'
      })
    }
    return null
  })
})