import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Dumbbell, Users, CheckCircle, AlertCircle, Clock,
  Eye, EyeOff, Mail, Lock, User, Ruler, Weight,
  ChevronDown,
} from 'lucide-react'
import { familiesApi, type InvitationPreview, type InviteAcceptPayload } from '../api/families'
import { useAuthStore } from '../store/authStore'
import { LoadingSpinner } from '../components/LoadingSpinner'

// ── tiny helpers ──────────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

// ── Component ─────────────────────────────────────────────────────────────────
export function JoinFamily() {
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const { setAuth } = useAuthStore()

  const token = params.get('token') || params.get('t') || ''

  // preview state
  const [preview,  setPreview]  = useState<InvitationPreview | null>(null)
  const [loadingP, setLoadingP] = useState(true)
  const [previewErr, setPreviewErr] = useState('')

  // form state
  const [form, setForm] = useState<{
    name: string; email: string; password: string; confirmPassword: string
    age: string; height_cm: string; current_weight_kg: string
    target_weight_kg: string; goal_type: string
  }>({
    name: '', email: '', password: '', confirmPassword: '',
    age: '', height_cm: '', current_weight_kg: '',
    target_weight_kg: '', goal_type: '',
  })
  const [showPw,   setShowPw]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formErr,  setFormErr]  = useState('')
  const [done,     setDone]     = useState(false)

  // ── Load preview ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setLoadingP(false); return }
    familiesApi.getInvitePreview(token)
      .then(p => {
        setPreview(p)
        // Pre-fill email from scoped invite
        if (p.email) setForm(f => ({ ...f, email: p.email! }))
      })
      .catch(() => setPreviewErr('This invite link is invalid or has expired.'))
      .finally(() => setLoadingP(false))
  }, [token])

  // ── Submit: register + join ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErr('')

    if (form.password !== form.confirmPassword) {
      setFormErr('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setFormErr('Password must be at least 8 characters')
      return
    }

    setSubmitting(true)
    try {
      const payload: InviteAcceptPayload = {
        name:     form.name.trim(),
        email:    form.email.trim(),
        password: form.password,
        ...(form.age               && { age: parseInt(form.age) }),
        ...(form.height_cm         && { height_cm: parseFloat(form.height_cm) }),
        ...(form.current_weight_kg && { current_weight_kg: parseFloat(form.current_weight_kg) }),
        ...(form.target_weight_kg  && { target_weight_kg:  parseFloat(form.target_weight_kg) }),
        ...(form.goal_type         && { goal_type: form.goal_type as InviteAcceptPayload['goal_type'] }),
      }

      const res = await familiesApi.acceptInviteWithRegistration(token, payload)
      setAuth(res.user, res.access_token)
      setDone(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err: any) {
      setFormErr(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100
                    dark:from-gray-950 dark:to-gray-900 py-10 px-4">
      <div className="w-full max-w-lg mx-auto">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14
                          rounded-2xl bg-primary-600 shadow-lg mb-4">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FamilyFit</h1>
        </div>

        {/* ── Loading ── */}
        {loadingP && (
          <div className="card flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* ── No token ── */}
        {!loadingP && !token && (
          <div className="card text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
            <h2 className="font-semibold text-gray-900 dark:text-white mb-1">No invite token</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Make sure you opened the full invite link. Ask the family admin to resend it.
            </p>
          </div>
        )}

        {/* ── Preview error ── */}
        {!loadingP && previewErr && (
          <div className="card text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
            <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Invite not valid</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{previewErr}</p>
          </div>
        )}

        {/* ── Success ── */}
        {done && (
          <div className="card text-center py-10">
            <CheckCircle className="w-14 h-14 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Welcome to {preview?.family_name}!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your account is ready. Taking you to the dashboard…
            </p>
          </div>
        )}

        {/* ── Main: preview + registration form ── */}
        {!loadingP && preview && !previewErr && !done && (
          <>
            {/* Family preview card */}
            <div className="card mb-6 shadow-lg">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/40
                                flex items-center justify-center flex-shrink-0">
                  <Users className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">
                    You&apos;re invited to join
                  </p>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                    {preview.family_name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Invited by{' '}
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {preview.invited_by}
                    </span>
                  </p>
                </div>
              </div>

              {preview.message && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                    &ldquo;{preview.message}&rdquo;
                  </p>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Expires {fmtDate(preview.expires_at)}</span>
              </div>

              {!preview.valid && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20
                                border border-amber-200 dark:border-amber-800
                                text-amber-700 dark:text-amber-400 text-sm">
                  This invite has expired or been revoked. Ask the admin to send a new one.
                </div>
              )}
            </div>

            {/* Registration form — only when invite is valid */}
            {preview.valid && (
              <div className="card shadow-xl">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Create your account
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Fill in your details to join {preview.family_name}.
                  </p>
                </div>

                {formErr && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20
                                  border border-red-200 dark:border-red-800
                                  text-red-700 dark:text-red-400 text-sm">
                    {formErr}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* ── Account details ── */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500
                                  uppercase tracking-wide">
                      Account
                    </p>

                    {/* Name */}
                    <div>
                      <label className="label">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2
                                         w-4 h-4 text-gray-400" />
                        <input
                          className="input pl-9"
                          placeholder="Venkat Jampana"
                          value={form.name}
                          onChange={set('name')}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="label">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2
                                         w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          className="input pl-9"
                          placeholder="dad@gmail.com"
                          value={form.email}
                          onChange={set('email')}
                          required
                          readOnly={!!preview.email}  // lock if scoped invite
                        />
                      </div>
                      {preview.email && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          This invite is tied to {preview.email}.
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="label">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2
                                         w-4 h-4 text-gray-400" />
                        <input
                          type={showPw ? 'text' : 'password'}
                          className="input pl-9 pr-10"
                          placeholder="Min. 8 characters"
                          value={form.password}
                          onChange={set('password')}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2
                                     text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="label">Confirm Password</label>
                      <input
                        type={showPw ? 'text' : 'password'}
                        className="input"
                        placeholder="Repeat password"
                        value={form.confirmPassword}
                        onChange={set('confirmPassword')}
                        required
                      />
                    </div>
                  </div>

                  {/* ── Health profile (optional) ── */}
                  <div className="pt-2 space-y-3">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500
                                  uppercase tracking-wide">
                      Health Profile <span className="font-normal normal-case">(optional)</span>
                    </p>

                    {/* Age + Height */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Age</label>
                        <input
                          type="number"
                          className="input"
                          placeholder="45"
                          min={10}
                          max={120}
                          value={form.age}
                          onChange={set('age')}
                        />
                      </div>
                      <div>
                        <label className="label">Height (cm)</label>
                        <div className="relative">
                          <Ruler className="absolute left-3 top-1/2 -translate-y-1/2
                                            w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            className="input pl-9"
                            placeholder="170"
                            min={100}
                            max={250}
                            step={0.1}
                            value={form.height_cm}
                            onChange={set('height_cm')}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Current + Target weight */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Current Weight (kg)</label>
                        <div className="relative">
                          <Weight className="absolute left-3 top-1/2 -translate-y-1/2
                                             w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            className="input pl-9"
                            placeholder="80"
                            min={20}
                            max={300}
                            step={0.1}
                            value={form.current_weight_kg}
                            onChange={set('current_weight_kg')}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label">Target Weight (kg)</label>
                        <input
                          type="number"
                          className="input"
                          placeholder="75"
                          min={20}
                          max={300}
                          step={0.1}
                          value={form.target_weight_kg}
                          onChange={set('target_weight_kg')}
                        />
                      </div>
                    </div>

                    {/* Goal */}
                    <div>
                      <label className="label">Fitness Goal</label>
                      <div className="relative">
                        <select
                          className="input appearance-none pr-9"
                          value={form.goal_type}
                          onChange={set('goal_type')}
                        >
                          <option value="">Select a goal…</option>
                          <option value="lose_weight">Lose Weight</option>
                          <option value="gain_muscle">Gain Muscle</option>
                          <option value="maintain">Maintain Weight</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                                                w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="btn-primary w-full py-3 mt-2"
                    disabled={submitting}
                  >
                    {submitting
                      ? <LoadingSpinner size="sm" />
                      : <>Join {preview.family_name} →</>
                    }
                  </button>

                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                    Already have an account?{' '}
                    <a
                      href={`/login?redirect=/join?token=${token}`}
                      className="text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Sign in instead
                    </a>
                  </p>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
