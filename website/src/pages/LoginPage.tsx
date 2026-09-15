import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signIn, resetPassword, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password reset state
  const [resetSent, setResetSent] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setLoading(false);

    if (signInError) {
      setError(signInError);
    } else {
      navigate(redirectPath);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setResetLoading(true);
    await resetPassword(resetEmail.trim());
    setResetLoading(false);
    setResetSent(true);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4 bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-hud-primary/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md hud-card rounded-2xl p-8 sm:p-10 border-hud-border relative z-10 shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-surface border border-hud-border mx-auto flex items-center justify-center shadow-hud-cyan mb-4">
            <Shield className="w-6 h-6 text-hud-primary" />
          </div>
          <h1 className="font-heading font-bold text-2xl text-hud-text">
            Sign In to Vizor
          </h1>
          <p className="text-xs text-hud-muted mt-1">
            Access your helmet telemetry and emergency SOS dispatch settings.
          </p>

          {isDemoMode && (
            <div className="mt-3 py-1 px-3 rounded-full bg-hud-primary/10 border border-hud-primary/30 inline-block text-[11px] font-mono text-hud-primary">
              ⚡ Local Demo Mode Active
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-hud-hazard/10 border border-hud-hazard/30 flex items-center gap-2.5 text-xs text-hud-hazard animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-hud-muted mb-1.5 uppercase tracking-wider">
              Rider Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-hud-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rider@domain.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface/80 border border-hud-border text-sm text-hud-text placeholder:text-hud-muted/50 focus:outline-none focus:border-hud-primary focus:ring-1 focus:ring-hud-primary transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-hud-muted uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setShowResetModal(true);
                  setResetSent(false);
                }}
                className="text-xs text-hud-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-hud-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface/80 border border-hud-border text-sm text-hud-text placeholder:text-hud-muted/50 focus:outline-none focus:border-hud-primary focus:ring-1 focus:ring-hud-primary transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-hud-primary text-background font-bold text-sm shadow-hud-cyan hover:bg-hud-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="font-mono text-xs animate-pulse">Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 text-center text-xs text-hud-muted">
          Don't have an account?{' '}
          <Link to="/signup" className="text-hud-primary font-semibold hover:underline">
            Join the beta
          </Link>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm hud-card rounded-2xl p-6 border-hud-border relative shadow-2xl">
            <h3 className="font-heading font-semibold text-lg text-hud-text mb-2">
              Reset Password
            </h3>
            <p className="text-xs text-hud-muted mb-4">
              Enter your email to receive a password reset link.
            </p>

            {resetSent ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-10 h-10 text-hud-safe mx-auto mb-2" />
                <p className="text-xs text-hud-text">
                  Reset link sent to <span className="font-mono text-hud-primary">{resetEmail}</span>
                </p>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="mt-4 px-4 py-2 rounded-xl bg-surface border border-hud-border text-xs text-hud-text"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="rider@domain.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-hud-border text-xs text-hud-text focus:outline-none focus:border-hud-primary"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3.5 py-2 rounded-xl border border-hud-border text-xs text-hud-muted hover:text-hud-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 rounded-xl bg-hud-primary text-background font-bold text-xs hover:bg-hud-primary/90 disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
