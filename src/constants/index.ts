// Default spreadsheet dimensions
export const DEFAULT_CELL_HEIGHT = 32
export const DEFAULT_CELL_WIDTH = 82
export const DEFAULT_HEADER_HEIGHT = 32
export const DEFAULT_HEADER_WIDTH = 52

// Grid limits
export const MAX_ROWS = 1000
export const MAX_COLS = 26

// Resize constraints
export const MIN_CELL_SIZE = 20

// Viewport buffer for virtual scrolling
export const VIEWPORT_BUFFER_ROWS = 5
export const VIEWPORT_BUFFER_COLS = 2

// UI delays and timeouts
export const HEADER_HOVER_DELAY = 150
export const BUTTON_HIDE_DELAY = 100

// Z-index layers
export const Z_INDEX = {
  CELL: 1,
  MERGED_CELL: 2,
  STRUCTURE_OVERLAY: 3,
  STRUCTURE_NAME_TAB: 4,
  STRUCTURE_RESIZE_HANDLE: 5,
  RANGE_SELECTION: 10,
  HEADER: 10,
  STICKY_CORNER: 20,
  RESIZE_HANDLE: 20,
  GHOSTED_HOVER: 45,
  ADD_BUTTON: 50,
} as const

// Generate column letters A-Z
export const generateColumnLetters = (): string[] => {
  const letters = []
  for (let i = 0; i < MAX_COLS; i++) {
    letters.push(String.fromCharCode(65 + i)) // A-Z
  }
  return letters
}

export const COLUMN_LETTERS = generateColumnLetters()

export const CELL_COLOR = {
  BORDER: 'border-gray-400',
  TAB: 'bg-gray-400'
}

export const TABLE_COLOR = {
  BORDER: 'border-green-600',
  BACKGROUND: 'bg-green-50',
  TAB: 'bg-green-600'
}

export const ARRAY_COLOR = {
  BORDER: 'border-blue-600',
  BACKGROUND: 'bg-blue-50',
  TAB: 'bg-blue-600'
}

export const TEMPLATE_COLOR = {
  BORDER: 'border-purple-600',
  BACKGROUND: 'bg-purple-50',
  TAB: 'bg-purple-600'
}
