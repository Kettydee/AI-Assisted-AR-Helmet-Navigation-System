import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InteractiveHud } from '../components/InteractiveHud';
import { SosContactsManager } from '../components/SosContactsManager';
import { 
  Shield, 
  User, 
  Settings, 
  LogOut, 
  LayoutDashboard, 
  Radio, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Database
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export const DashboardPage: React.FC = () => {
  const { user, signOut, updatePassword, isDemoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentTab = searchParams.get('tab') === 'account' ? 'account' : 'hud';

  // Account password change form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSuccess(null);
    setPwError(null);

    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError('Passwords do not match.');
      return;
    }

    setPwLoading(true);
    const { error } = await updatePassword(newPassword);
    setPwLoading(false);

    if (error) {
      setPwError(error);
    } else {
      setPwSuccess('Password updated successfully.');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-background text-hud-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header & Welcome Banner */}
        <div className="hud-card rounded-2xl p-6 sm:p-8 mb-8 border-hud-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-hud-primary/10 border border-hud-primary/30 text-xs font-mono text-hud-primary mb-3">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>RIDER TELEMETRY ACTIVE</span>
              </div>
              <h1 className="font-heading font-bold text-2xl sm:text-4xl text-hud-text">
                Welcome back, {user?.name || 'Rider'}
              </h1>
              <p className="text-xs sm:text-sm text-hud-muted mt-1.5 flex items-center gap-2">
                <span>Beta Tester Status:</span>
                <span className="font-mono text-hud-safe font-medium">Phase 2 Testing Pool (Active)</span>
                <span className="text-hud-muted/40">·</span>
                <span className="font-mono text-hud-muted">Firmware ESP32-S3 v0.2.1</span>
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSearchParams(currentTab === 'account' ? {} : { tab: 'account' })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                  currentTab === 'account'
                    ? 'bg-hud-primary text-background border-hud-primary font-bold shadow-hud-cyan'
                    : 'bg-surface border-hud-border text-hud-text hover:border-hud-primary'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>{currentTab === 'account' ? 'View HUD' : 'Account Settings'}</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-hud-border hover:border-hud-hazard text-hud-muted hover:text-hud-hazard text-xs font-medium transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>

          {/* Environment Status Badge */}
          <div className="mt-6 pt-4 border-t border-hud-border/60 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-hud-muted">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-hud-primary" />
              <span>Backend Auth & Contacts:</span>
              {isSupabaseConfigured ? (
                <span className="text-hud-safe font-semibold">Supabase Connected (RLS Enabled)</span>
              ) : (
                <span className="text-hud-warning font-semibold">
                  Local Demo Storage (Drop Supabase keys in .env for Cloud Sync)
                </span>
              )}
            </div>
            <div>
              UID: <span className="text-hud-text">{user?.id.slice(0, 16)}...</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-8 border-b border-hud-border pb-4">
          <button
            onClick={() => setSearchParams({})}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              currentTab === 'hud'
                ? 'bg-hud-primary text-background font-bold shadow-hud-cyan'
                : 'text-hud-muted hover:text-hud-text hover:bg-surface'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Telemetry & HUD</span>
          </button>

          <button
            onClick={() => setSearchParams({ tab: 'account' })}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              currentTab === 'account'
                ? 'bg-hud-primary text-background font-bold shadow-hud-cyan'
                : 'text-hud-muted hover:text-hud-text hover:bg-surface'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Rider Profile & Security</span>
          </button>
        </div>

        {/* TAB 1: HUD & SOS CONTACTS */}
        {currentTab === 'hud' ? (
          <div className="space-y-12">
            {/* Interactive HUD Preview Reused Component */}
            <div className="hud-card rounded-2xl p-6 sm:p-8">
              <div className="mb-6">
                <span className="text-xs font-mono text-hud-primary uppercase tracking-widest">
                  Live Visor Projection
                </span>
                <h2 className="font-heading font-bold text-2xl text-hud-text mt-1">
                  Your HUD
                </h2>
                <p className="text-xs text-hud-muted mt-1">
                  Interactive peripheral birdbath display output as rendered inside your helmet visor.
                </p>
              </div>

              <InteractiveHud panelTitle="Live Helmet Visor Stream" />
            </div>

            {/* Emergency SOS Contacts Card */}
            <SosContactsManager />
          </div>
        ) : (
          /* TAB 2: ACCOUNT SETTINGS */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-200">
            {/* Profile Info Card */}
            <div className="hud-card rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-hud-border">
                <div className="w-10 h-10 rounded-xl bg-hud-primary/10 border border-hud-primary/30 flex items-center justify-center text-hud-primary font-bold font-mono">
                  {user?.name ? user.name[0].toUpperCase() : 'R'}
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-lg text-hud-text">
                    Rider Profile
                  </h3>
                  <p className="text-xs text-hud-muted">
                    Your personal Vizor beta credentials
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <span className="text-hud-muted block mb-1">Full Name</span>
                  <div className="p-3 rounded-xl bg-surface border border-hud-border text-hud-text">
                    {user?.name || 'Rider'}
                  </div>
                </div>

                <div>
                  <span className="text-hud-muted block mb-1">Registered Email</span>
                  <div className="p-3 rounded-xl bg-surface border border-hud-border text-hud-text">
                    {user?.email}
                  </div>
                </div>

                <div>
                  <span className="text-hud-muted block mb-1">Rider ID (UUID)</span>
                  <div className="p-3 rounded-xl bg-surface border border-hud-border text-hud-muted break-all">
                    {user?.id}
                  </div>
                </div>

                <div className="pt-4 border-t border-hud-border">
                  <span className="text-hud-muted block mb-1">Assigned Helmet Node</span>
                  <div className="p-3 rounded-xl bg-surface border border-hud-border text-hud-safe">
                    ESP32-S3-BPI-M4-PROTOTYPE-01 (Paired)
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="hud-card rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-hud-border">
                <div className="w-10 h-10 rounded-xl bg-hud-purple/10 border border-hud-purple/30 flex items-center justify-center text-hud-purple">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-lg text-hud-text">
                    Security & Password
                  </h3>
                  <p className="text-xs text-hud-muted">
                    Update your account access passphrase
                  </p>
                </div>
              </div>

              {pwSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-hud-safe/10 border border-hud-safe/30 flex items-center gap-2 text-xs text-hud-safe">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{pwSuccess}</span>
                </div>
              )}

              {pwError && (
                <div className="mb-4 p-3 rounded-xl bg-hud-hazard/10 border border-hud-hazard/30 flex items-center gap-2 text-xs text-hud-hazard">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pwError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-hud-muted mb-1.5 uppercase">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-hud-border text-xs text-hud-text focus:outline-none focus:border-hud-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-hud-muted mb-1.5 uppercase">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-hud-border text-xs text-hud-text focus:outline-none focus:border-hud-primary"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="w-full py-2.5 rounded-xl bg-hud-primary text-background font-bold text-xs shadow-hud-cyan hover:bg-hud-primary/90 transition-all disabled:opacity-50"
                  >
                    {pwLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-hud-border">
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 rounded-xl bg-hud-hazard/10 border border-hud-hazard/30 text-hud-hazard hover:bg-hud-hazard hover:text-white text-xs font-bold transition-all"
                >
                  Log out of this device
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
