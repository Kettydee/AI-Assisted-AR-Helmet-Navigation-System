import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4 bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-hud-hazard/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="hud-card rounded-2xl p-8 sm:p-12 max-w-md w-full text-center border-hud-border relative z-10 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-hud-hazard/10 border border-hud-hazard/30 mx-auto flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-hud-hazard animate-pulse" />
        </div>

        <div className="font-mono text-xs text-hud-hazard uppercase tracking-widest mb-1">
          404 · Signal Lost
        </div>

        <h1 className="font-heading font-bold text-3xl text-hud-text mb-3">
          Off Route
        </h1>

        <p className="text-xs sm:text-sm text-hud-muted mb-8 leading-relaxed">
          The requested waypoint coordinates do not exist or have been rerouted. Check the HUD path and return to the main route.
        </p>

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-hud-primary text-background font-bold text-xs shadow-hud-cyan hover:bg-hud-primary/90 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Homepage</span>
        </Link>
      </div>
    </div>
  );
};
