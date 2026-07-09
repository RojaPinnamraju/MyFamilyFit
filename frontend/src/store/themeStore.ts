import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
  toggle: () => void
  setDark: (dark: boolean) => void
}

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const stored = localStorage.getItem('ff_theme')
const initial = stored ? stored === 'dark' : prefersDark

if (initial) document.documentElement.classList.add('dark')

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: initial,

  toggle: () => {
    const next = !get().isDark
    if (next) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('ff_theme', next ? 'dark' : 'light')
    set({ isDark: next })
  },

  setDark: (dark) => {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('ff_theme', dark ? 'dark' : 'light')
    set({ isDark: dark })
  },
}))
