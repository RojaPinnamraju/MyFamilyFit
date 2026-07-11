import { useEffect, useState, useCallback } from 'react'
import {
  Users, Plus, LogIn, Copy, Check, Crown, LogOut,
  Mail, Link as LinkIcon, Trash2, UserMinus, ShieldCheck, Shield, X
} from 'lucide-react'
import { familiesApi, type InvitationResponse } from '../api/families'
import type { Family as FamilyData } from '../types'
import { LoadingSpinner, PageLoader } from '../components/LoadingSpinner'
import { useAuthStore } from '../store/authStore'

// ─── helpers ──────────────────────────────────────────────────────────────────
const goalLabel = (g?: string) => {
  if (g === 'lose_weight') return 'Lose Weight'
  if (g === 'gain_muscle') return 'Gain Muscle'
  if (g === 'maintain') return 'Maintain'
  return '—'
}

function copyText(text: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  })
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
interface InviteModalProps {
  onClose: () => void
  onCreated: (inv: InvitationResponse) => void
}

function InviteModal({ onClose, onCreated }: InviteModalProps) {
  const [email, setEmail]     = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [result, setResult]   = useState<InvitationResponse | null>(null)
  const [copied, setCopied]   = useState<'url' | 'token' | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const inv = await familiesApi.createInvitation({ email: email || undefined, message: message || undefined })
      setResult(inv)
      onCreated(inv)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create invitation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Invite a Family Member</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email (optional)</label>
                <input
                  type="email"
                  className="input"
                  placeholder="member@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Leave blank for a shareable link anyone can use.
                </p>
              </div>
              <div>
                <label className="label">Personal Message (optional)</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="Come join our family on MyFamilyFit!"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading ? <LoadingSpinner size="sm" /> : <><Mail className="w-4 h-4" /> Generate Invite</>}
                </button>
                <button type="button" onClick={onClose} className="btn-secondary px-4">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {result.email_sent ? (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Invite email sent to <strong>{result.email}</strong>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Email not configured — share the link below manually.
                </div>
              )}

              <div>
                <p className="label mb-1">Invite Link</p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <p className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate font-mono">{result.invite_url}</p>
                  <button
                    onClick={() => copyText(result.invite_url, v => setCopied(v ? 'url' : null))}
                    className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex-shrink-0"
                  >
                    {copied === 'url' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                Expires {new Date(result.expires_at).toLocaleDateString()}
              </p>

              <button onClick={onClose} className="btn-secondary w-full">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Family() {
  const { user } = useAuthStore()

  const [family, setFamily]           = useState<FamilyData | null>(null)
  const [invitations, setInvitations] = useState<InvitationResponse[]>([])
  const [loading, setLoading]         = useState(true)
  const [mode, setMode]               = useState<'create' | 'join' | null>(null)
  const [familyName, setFamilyName]   = useState('')
  const [inviteCode, setInviteCode]   = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [copied, setCopied]           = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const isAdmin = family?.members.some(m => m.user.id === user?.id && m.role === 'admin') ?? false

  const loadFamily = useCallback(async () => {
    try {
      const f = await familiesApi.getMyFamily()
      setFamily(f)
      const isAdminLocal = f.members.some(m => m.user.id === user?.id && m.role === 'admin')
      if (isAdminLocal) {
        const inv = await familiesApi.listInvitations()
        setInvitations(inv.filter(i => i.status === 'pending'))
      }
    } catch {
      setFamily(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadFamily() }, [loadFamily])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    try {
      const f = await familiesApi.create(familyName)
      setFamily(f); setMode(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create family')
    } finally { setSubmitting(false) }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    try {
      const f = await familiesApi.join(inviteCode.trim().toUpperCase())
      setFamily(f); setMode(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid invite code')
    } finally { setSubmitting(false) }
  }

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this family?')) return
    await familiesApi.leaveFamily()
    setFamily(null)
  }

  const handleRemoveMember = async (userId: number, name: string) => {
    if (!confirm(`Remove ${name} from the family?`)) return
    await familiesApi.removeMember(userId)
    await loadFamily()
  }

  const handleToggleRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin'
    if (!confirm(`Change this member to ${newRole}?`)) return
    await familiesApi.changeRole(userId, newRole)
    await loadFamily()
  }

  const handleRevokeInvite = async (id: number) => {
    if (!confirm('Revoke this invitation?')) return
    await familiesApi.revokeInvitation(id)
    setInvitations(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return <PageLoader />

  // ── No family ──────────────────────────────────────────────────────────────
  if (!family) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="card text-center py-10">
          <Users className="w-14 h-14 mx-auto text-primary-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Join or Create a Family</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
            Track your health journey together with your family members.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setMode('create'); setError('') }} className="btn-primary">
              <Plus className="w-4 h-4" /> Create Family
            </button>
            <button onClick={() => { setMode('join'); setError('') }} className="btn-secondary">
              <LogIn className="w-4 h-4" /> Join Family
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {mode === 'create' && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Create New Family</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Family Name</label>
                <input
                  className="input"
                  placeholder="The Smith Family"
                  value={familyName}
                  onChange={e => setFamilyName(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <LoadingSpinner size="sm" /> : 'Create'}
                </button>
                <button type="button" onClick={() => setMode(null)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {mode === 'join' && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Join a Family</h3>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="label">Invite Code</label>
                <input
                  className="input uppercase tracking-widest"
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <LoadingSpinner size="sm" /> : 'Join'}
                </button>
                <button type="button" onClick={() => setMode(null)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    )
  }

  // ── Has family ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onCreated={inv => setInvitations(prev => [inv, ...prev])}
        />
      )}

      {/* Family header */}
      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{family.name}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {family.members.length} member{family.members.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Invite code chip */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <span className="text-sm font-mono font-bold tracking-widest text-gray-700 dark:text-gray-200">
                {family.invite_code}
              </span>
              <button
                onClick={() => copyText(family.invite_code, setCopied)}
                className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                title="Copy invite code"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="btn-primary gap-1.5 text-sm"
              >
                <Plus className="w-4 h-4" /> Invite
              </button>
            )}

            <button onClick={handleLeave} className="btn-danger p-2" title="Leave family">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          Share the invite code or use the Invite button to generate a link.
        </p>
      </div>

      {/* Members list */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Members</h3>
        <div className="space-y-3">
          {family.members.map(member => {
            const isMe = member.user.id === user?.id
            return (
              <div key={member.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: member.user.avatar_color }}
                >
                  {member.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{member.user.name}</p>
                    {member.role === 'admin' && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    {isMe && (
                      <span className="badge bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">You</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.user.email}</p>
                </div>

                <div className="hidden sm:block text-right flex-shrink-0 mr-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{goalLabel(member.user.goal_type)}</p>
                  {member.user.current_weight_kg && (
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{member.user.current_weight_kg} kg</p>
                  )}
                </div>

                {/* Admin controls — hidden for self */}
                {isAdmin && !isMe && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleRole(member.user.id, member.role)}
                      title={member.role === 'admin' ? 'Remove admin' : 'Make admin'}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                    >
                      {member.role === 'admin'
                        ? <Shield className="w-4 h-4" />
                        : <ShieldCheck className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member.user.id, member.user.name)}
                      title="Remove member"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Pending invitations — admin only */}
      {isAdmin && invitations.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Pending Invitations
            <span className="ml-2 badge bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              {invitations.length}
            </span>
          </h3>
          <div className="space-y-3">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {inv.email || 'Open link (no email)'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => copyText(inv.invite_url, () => {})}
                  title="Copy link"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRevokeInvite(inv.id)}
                  title="Revoke"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
