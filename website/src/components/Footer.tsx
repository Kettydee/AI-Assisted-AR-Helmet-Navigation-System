import { Shield } from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-hud-border bg-surface/60 backdrop-blur-sm text-sm text-hud-muted py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Logo & Tagline */}
          <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-surface border border-hud-border flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-hud-primary" />
              </div>
              <span className="font-heading font-bold text-lg tracking-wider text-hud-text">
                VIZOR
              </span>
            </div>
            <p className="text-xs text-hud-muted max-w-sm">
              See the road ahead. Never look down. Real-time edge AI AR HUD system for motorcycle riders.
            </p>
          </div>

          {/* Repeated Nav Links */}
          <div className="flex flex-wrap justify-center gap-6 text-xs font-medium">
            <a href="#how" className="hover:text-hud-primary transition-colors">How it Works</a>
            <a href="#features" className="hover:text-hud-primary transition-colors">Features</a>
            <a href="#specs" className="hover:text-hud-primary transition-colors">Tech Specs</a>
            <a href="#roadmap" className="hover:text-hud-primary transition-colors">Roadmap</a>
            <Link to="/login" className="hover:text-hud-primary transition-colors">Rider Login</Link>
            <a
              href="https://github.com/Kettydee/AI-Assisted-AR-Helmet-Navigation-System"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-hud-text transition-colors"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>

          {/* License & Small Print */}
          <div className="flex flex-col items-center md:items-end gap-1 text-xs">
            <span className="font-mono text-hud-primary bg-hud-primary/10 px-2 py-0.5 rounded border border-hud-primary/20">
              MIT Licensed · Prototype 2026
            </span>
            <span className="text-[11px] text-hud-muted/70">
              Open source & community built. Not certified for road racing.
            </span>
          </div>

        </div>
      </div>
    </footer>
  );
};
