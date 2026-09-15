import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, LogOut, Menu, X, ChevronDown, LayoutDashboard, Settings } from 'lucide-react';
import { GithubIcon } from './GithubIcon';

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isLandingPage = location.pathname === '/';

  const handleNavClick = (anchorId: string) => {
    setMobileMenuOpen(false);
    if (isLandingPage) {
      const element = document.getElementById(anchorId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(`/#${anchorId}`);
    }
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-hud-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-surface border border-hud-border flex items-center justify-center group-hover:border-hud-primary transition-all duration-300">
              <Shield className="w-4 h-4 text-hud-primary" />
            </div>
            <span className="font-heading font-bold text-xl tracking-wider text-hud-text">
              VIZOR
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-hud-primary/10 text-hud-primary border border-hud-primary/30">
              HUD v0.2
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <button
              onClick={() => handleNavClick('how')}
              className="text-hud-muted hover:text-hud-primary transition-colors duration-150"
            >
              How it Works
            </button>
            <button
              onClick={() => handleNavClick('features')}
              className="text-hud-muted hover:text-hud-primary transition-colors duration-150"
            >
              Features
            </button>
            <button
              onClick={() => handleNavClick('specs')}
              className="text-hud-muted hover:text-hud-primary transition-colors duration-150"
            >
              Tech Specs
            </button>
            <button
              onClick={() => handleNavClick('roadmap')}
              className="text-hud-muted hover:text-hud-primary transition-colors duration-150"
            >
              Roadmap
            </button>
            <a
              href="https://github.com/Kettydee/AI-Assisted-AR-Helmet-Navigation-System"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-hud-muted hover:text-hud-text transition-colors duration-150"
            >
              <GithubIcon className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>

          {/* Auth CTA / User Dropdown */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-surface border border-hud-border hover:border-hud-primary text-sm transition-all duration-150"
                >
                  <div className="w-6 h-6 rounded-full bg-hud-primary/20 text-hud-primary font-mono text-xs font-semibold flex items-center justify-center border border-hud-primary/40">
                    {user.name ? user.name[0].toUpperCase() : 'R'}
                  </div>
                  <span className="font-medium text-hud-text max-w-[120px] truncate">{user.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-hud-muted" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface border border-hud-border shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-hud-border/50">
                      <p className="text-xs text-hud-muted">Signed in as</p>
                      <p className="text-sm font-medium text-hud-text truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-hud-text hover:bg-surface-hover hover:text-hud-primary transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <Link
                      to="/dashboard?tab=account"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-hud-text hover:bg-surface-hover hover:text-hud-primary transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Account Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-hud-hazard hover:bg-surface-hover transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-hud-text hover:text-hud-primary transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-1.5 text-sm font-medium rounded-lg bg-hud-primary text-background font-semibold hover:bg-hud-primary/90 hover:shadow-hud-cyan transition-all duration-200"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-surface border border-hud-border text-hud-muted hover:text-hud-text"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-hud-border px-4 pt-2 pb-5 space-y-3">
          <div className="flex flex-col space-y-2 pt-2 text-sm">
            <button
              onClick={() => handleNavClick('how')}
              className="text-left py-1.5 text-hud-muted hover:text-hud-primary"
            >
              How it Works
            </button>
            <button
              onClick={() => handleNavClick('features')}
              className="text-left py-1.5 text-hud-muted hover:text-hud-primary"
            >
              Features
            </button>
            <button
              onClick={() => handleNavClick('specs')}
              className="text-left py-1.5 text-hud-muted hover:text-hud-primary"
            >
              Tech Specs
            </button>
            <button
              onClick={() => handleNavClick('roadmap')}
              className="text-left py-1.5 text-hud-muted hover:text-hud-primary"
            >
              Roadmap
            </button>
            <a
              href="https://github.com/Kettydee/AI-Assisted-AR-Helmet-Navigation-System"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 py-1.5 text-hud-muted hover:text-hud-text"
            >
              <GithubIcon className="w-4 h-4" />
              <span>GitHub Repository</span>
            </a>
          </div>

          <div className="pt-3 border-t border-hud-border/70 flex flex-col gap-2">
            {user ? (
              <>
                <div className="flex items-center gap-2 py-1 text-sm text-hud-text">
                  <User className="w-4 h-4 text-hud-primary" />
                  <span className="font-medium truncate">{user.name} ({user.email})</span>
                </div>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 rounded-lg bg-surface border border-hud-border text-sm font-medium text-hud-text hover:border-hud-primary"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-center py-2 rounded-lg bg-hud-hazard/10 border border-hud-hazard/30 text-sm font-medium text-hud-hazard"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 rounded-lg bg-surface border border-hud-border text-sm font-medium text-hud-text"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 rounded-lg bg-hud-primary text-background font-semibold text-sm hover:bg-hud-primary/90"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
