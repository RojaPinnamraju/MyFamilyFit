import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, LogIn, Dumbbell, ArrowRight } from 'lucide-react'
import { familiesApi } from '../api/families'
import { useAuthStore } from '../store/authStore'
import { LoadingSpinner } from '../components/LoadingSpinner'

type Step = 'choose' | 'create' | 'join'

export function Onboarding() {
  const navigate   = useNavigate()
  const { user }   = useAuthStore()
  const [step, setStep]         = useState<Step>('choose')
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await familiesApi.create(familyName.trim())
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create family')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await familiesApi.join(inviteCode.trim().toUpperCase())
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid invite code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 shadow-lg mb-4">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Let's get you set up with your family.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step: choose */}
        {step === 'choose' && (
          <div className="space-y-4">
            <button
              onClick={() => { setStep('create'); setError('') }}
              className="w-full card hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-200 dark:group-hover:bg-primary-900/60 transition-colors">
                  <Plus className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">Create a new family</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Start a family group and invite members
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
              </div>
            </button>

            <button
              onClick={() => { setStep('join'); setError('') }}
              className="w-full card hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 dark:group-hover:bg-green-900/60 transition-colors">
                  <LogIn className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">Join an existing family</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Enter an invite code or use an invite link
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
              </div>
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full text-center text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 py-3 transition-colors"
            >
              Skip for now — set up later
            </button>
          </div>
        )}

        {/* Step: create */}
        {step === 'create' && (
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep('choose')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ←
              </button>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Create your family</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">You'll be the admin and can invite others</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Family Name</label>
                <input
                  className="input"
                  placeholder="e.g. The Smith Family"
                  value={familyName}
                  onChange={e => setFamilyName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? <LoadingSpinner size="sm" /> : <><Users className="w-4 h-4" /> Create Family</>}
              </button>
            </form>
          </div>
        )}

        {/* Step: join */}
        {step === 'join' && (
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep('choose')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ←
              </button>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Join a family</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enter the invite code shared with you</p>
              </div>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="label">Invite Code</label>
                <input
                  className="input uppercase tracking-widest text-center text-lg font-bold"
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                  Got an invite link? Open it in your browser — it will bring you here automatically.
                </p>
              </div>
              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? <LoadingSpinner size="sm" /> : <><LogIn className="w-4 h-4" /> Join Family</>}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
