import { Menu, Sun, Moon, Bell } from 'lucide-react'
import { useThemeStore } from '../store/themeStore'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/family': 'Family',
  '/weight': 'Weight Tracking',
  '/workouts': 'Workout Tracking',
  '/meals': 'Meal Tracking',
  '/water': 'Water Tracking',
  '/profile': 'My Profile',
}

interface NavbarProps {
  onMenuClick: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { isDark, toggle } = useThemeStore()
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'FamilyFit'

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800
                       flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-gray-900 dark:text-white text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                     text-gray-600 dark:text-gray-400"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  )
}
