/**
 * /auth/callback
 *
 * Landing page after the Google OAuth flow completes. The backend redirects
 * here with either:
 *   ?token=<jwt>&next=<path>   — success
 *   ?error=<message>           — failure (user cancelled, config error, etc.)
 *
 * This page:
 *   1. Reads the token from the URL
 *   2. Calls GET /users/me to get the full user profile
 *   3. Stores auth in Zustand + localStorage
 *   4. Navigates to `next` (either /dashboard or /onboarding for new users)
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Dumbbell, AlertCircle } from 'lucide-react'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function GoogleCallback() {
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const { setAuth } = useAuthStore()

  const [error, setError] = useState('')

  useEffect(() => {
    const token    = params.get('token')
    const next     = params.get('next') || '/dashboard'
    const errorMsg = params.get('error')

    if (errorMsg) {
      setError(decodeURIComponent(errorMsg))
      return
    }

    if (!token) {
      setError('No token received from Google sign-in.')
      return
    }

    // Fetch the user's profile with the new JWT, then store auth state
    authApi.getMe(token)
      .then(user => {
        setAuth(user, token)
        navigate(next, { replace: true })
      })
      .catch(() => {
        setError('Failed to load your profile after sign-in. Please try again.')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center
                    bg-gradient-to-br from-primary-50 to-indigo-100
                    dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14
                        rounded-2xl bg-primary-600 shadow-lg mb-6">
          <Dumbbell className="w-7 h-7 text-white" />
        </div>

        {!error ? (
          <>
            <div className="flex justify-center mb-4">
              <LoadingSpinner size="lg" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Signing you in with Google…
            </p>
          </>
        ) : (
          <div className="max-w-sm mx-auto">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-gray-900 dark:text-white font-semibold mb-1">
              Sign-in failed
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
