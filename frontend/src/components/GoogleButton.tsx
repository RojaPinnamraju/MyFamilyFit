import { authApi } from '../api/auth'

interface Props {
  label?: string
}

/**
 * "Continue with Google" button.
 * Clicking it triggers a full-page redirect to the backend OAuth endpoint,
 * which then redirects to Google and finally back to /auth/callback.
 */
export function GoogleButton({ label = 'Continue with Google' }: Props) {
  return (
    <button
      type="button"
      onClick={() => authApi.startGoogleSignIn()}
      className="
        w-full flex items-center justify-center gap-3
        px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600
        bg-white dark:bg-gray-800
        text-gray-700 dark:text-gray-200
        font-medium text-sm
        hover:bg-gray-50 dark:hover:bg-gray-700
        active:bg-gray-100 dark:active:bg-gray-600
        transition-colors shadow-sm
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-900
      "
    >
      {/* Official Google "G" logo colours */}
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38
             30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43
             13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94
             c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18
             7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59
             l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54
             2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6
             c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91
             l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>
      {label}
    </button>
  )
}
