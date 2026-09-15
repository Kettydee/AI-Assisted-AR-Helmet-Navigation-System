import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const { signUp, isDemoMode } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Please provide your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: signUpError } = await signUp(email.trim(), password, name.trim());
    setLoading(false);

    if (signUpError) {
      setError(signUpError);
    } else {
      setToastMessage('Account created successfully! Redirecting to your HUD Dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4 bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-hud-primary/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 rounded-xl bg-hud-safe/20 border border-hud-safe text-white text-xs font-semibold flex items-center gap-2.5 shadow-2xl animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-hud-safe" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="w-full max-w-md hud-card rounded-2xl p-8 sm:p-10 border-hud-border relative z-10 shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-surface border border-hud-border mx-auto flex items-center justify-center shadow-hud-cyan mb-4">
            <Shield className="w-6 h-6 text-hud-primary" />
          </div>
          <h1 className="font-heading font-bold text-2xl text-hud-text">
            Join the Vizor Beta
          </h1>
          <p className="text-xs text-hud-muted mt-1">
            Create an account to configure your helmet HUD, emergency SOS contacts, and hazard maps.
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

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-hud-muted mb-1.5 uppercase tracking-wider">
              Rider Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-hud-muted" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Rider"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface/80 border border-hud-border text-sm text-hud-text placeholder:text-hud-muted/50 focus:outline-none focus:border-hud-primary focus:ring-1 focus:ring-hud-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-hud-muted mb-1.5 uppercase tracking-wider">
              Email Address
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
            <label className="block text-xs font-mono text-hud-muted mb-1.5 uppercase tracking-wider">
              Password (min 6 chars)
            </label>
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

          <div>
            <label className="block text-xs font-mono text-hud-muted mb-1.5 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-hud-muted" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              <span className="font-mono text-xs animate-pulse">Creating Account...</span>
            ) : (
              <>
                <span>Create Beta Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 text-center text-xs text-hud-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-hud-primary font-semibold hover:underline">
            Sign in
          </Link>
        </div>

      </div>
    </div>
  );
};
