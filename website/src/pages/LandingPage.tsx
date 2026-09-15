import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  ArrowRight, 
  Eye, 
  AlertOctagon, 
  VolumeX, 
  Cpu, 
  HardDrive, 
  Smartphone, 
  Navigation2, 
  Scan, 
  PhoneCall, 
  Mic, 
  Volume2, 
  Map, 
  CheckCircle, 
  Clock, 
  Compass, 
  CornerUpRight,
  Sparkles
} from 'lucide-react';
import { GithubIcon } from '../components/GithubIcon';
import { InteractiveHud } from '../components/InteractiveHud';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-hud-text selection:bg-hud-primary/30">
      
      {/* =========================================================================
          HERO SECTION
         ========================================================================= */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Soft background ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-hud-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-hud-purple/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Copy & CTAs */}
            <div className="lg:col-span-7 text-center lg:text-left">
              {/* Badges */}
              <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-6">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-surface border border-hud-border text-hud-muted">
                  MIT Licensed
                </span>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-hud-primary/10 border border-hud-primary/30 text-hud-primary font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-hud-primary animate-ping" />
                  Early Prototype
                </span>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-surface border border-hud-border text-hud-muted">
                  Indie Built
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
                See the road ahead.{' '}
                <span className="hud-gradient-text">Never look down.</span>
              </h1>

              {/* Subheadline */}
              <p className="mt-6 text-base sm:text-lg text-hud-muted max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Vizor projects turn-by-turn directions, real-time pothole warnings, and hands-free calls directly into your helmet visor — so your eyes stay on the road.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-hud-primary text-background font-bold text-sm shadow-hud-cyan hover:bg-hud-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>Join the beta</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="https://github.com/Kettydee/AI-Assisted-AR-Helmet-Navigation-System"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-surface border border-hud-border hover:border-hud-primary text-hud-text text-sm font-medium hover:bg-surface-hover transition-all"
                >
                  <GithubIcon className="w-4 h-4" />
                  <span>View on GitHub</span>
                </a>
              </div>
            </div>

            {/* Right Column: Stylized Speedometer / HUD Graphic */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full p-4 bg-surface/40 border border-hud-border flex items-center justify-center shadow-2xl hud-glow">
                {/* SVG Gauge & Reticle */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                  {/* Outer Background Arc */}
                  <circle
                    cx="100"
                    cy="100"
                    r="84"
                    fill="none"
                    stroke="#232B3D"
                    strokeWidth="4"
                    strokeDasharray="400"
                    strokeDashoffset="100"
                    strokeLinecap="round"
                  />
                  {/* Glowing Cyan Speed Indicator Arc */}
                  <circle
                    cx="100"
                    cy="100"
                    r="84"
                    fill="none"
                    stroke="#22D3EE"
                    strokeWidth="6"
                    strokeDasharray="400"
                    strokeDashoffset="240"
                    strokeLinecap="round"
                    className="filter drop-shadow-[0_0_8px_#22D3EE]"
                  />
                  {/* Subtle inner telemetry tick marks */}
                  <circle
                    cx="100"
                    cy="100"
                    r="72"
                    fill="none"
                    stroke="#232B3D"
                    strokeWidth="1"
                    strokeDasharray="2 8"
                  />
                </svg>

                {/* HUD Center Readout Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  {/* Green Linked Status Dot */}
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-hud-safe/10 border border-hud-safe/30 text-[10px] font-mono text-hud-safe mb-2">
                    <span className="w-2 h-2 rounded-full bg-hud-safe animate-ping" />
                    <span>HUD LINKED</span>
                  </div>

                  {/* Glowing Cyan Turn Indicator */}
                  <div className="my-1 flex items-center justify-center w-12 h-12 rounded-xl bg-hud-primary/10 border border-hud-primary/40 shadow-hud-cyan">
                    <CornerUpRight className="w-7 h-7 text-hud-primary" />
                  </div>

                  {/* Speedometer Readout */}
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="font-mono text-4xl sm:text-5xl font-bold text-white tracking-tighter">
                      52
                    </span>
                    <span className="font-mono text-xs text-hud-muted">KM/H</span>
                  </div>

                  <span className="text-[10px] font-mono text-hud-primary mt-1 tracking-wider">
                    NEXT: 200M RIGHT
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* =========================================================================
          THE PROBLEM SECTION (3 COLUMNS)
         ========================================================================= */}
      <section className="py-20 bg-surface/30 border-y border-hud-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono text-hud-primary uppercase tracking-widest">
              The Reality of Two Wheels
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mt-2 text-hud-text">
              Looking down at high speed isn't just inconvenient. It's dangerous.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Column 1 */}
            <div className="hud-card rounded-2xl p-6 sm:p-8 relative">
              <div className="w-12 h-12 rounded-xl bg-hud-warning/10 border border-hud-warning/30 flex items-center justify-center mb-6">
                <Eye className="w-6 h-6 text-hud-warning" />
              </div>
              <h3 className="font-heading font-semibold text-xl text-hud-text mb-3">
                Eyes leave the road
              </h3>
              <p className="text-sm text-hud-muted leading-relaxed">
                Looking down at a handlebar-mounted phone costs critical seconds. At 60 km/h, a 2-second glance means traveling 33 meters completely blind to the street.
              </p>
            </div>

            {/* Column 2 */}
            <div className="hud-card rounded-2xl p-6 sm:p-8 relative">
              <div className="w-12 h-12 rounded-xl bg-hud-hazard/10 border border-hud-hazard/30 flex items-center justify-center mb-6">
                <AlertOctagon className="w-6 h-6 text-hud-hazard" />
              </div>
              <h3 className="font-heading font-semibold text-xl text-hud-text mb-3">
                Hazards arrive fast
              </h3>
              <p className="text-sm text-hud-muted leading-relaxed">
                Potholes are easy to miss at speed, especially at night or during wet monsoon conditions where surface shadows mask deep wheel-bending craters.
              </p>
            </div>

            {/* Column 3 */}
            <div className="hud-card rounded-2xl p-6 sm:p-8 relative">
              <div className="w-12 h-12 rounded-xl bg-hud-purple/10 border border-hud-purple/30 flex items-center justify-center mb-6">
                <VolumeX className="w-6 h-6 text-hud-purple" />
              </div>
              <h3 className="font-heading font-semibold text-xl text-hud-text mb-3">
                Calls divide attention
              </h3>
              <p className="text-sm text-hud-muted leading-relaxed">
                One-handed calls in heavy wind are dangerous and hard to hear. Fumbling with phone screens in glove-clad hands breaks rider balance and reaction readiness.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
          HOW IT WORKS (3-TIER ARCHITECTURE)
         ========================================================================= */}
      <section id="how" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono text-hud-primary uppercase tracking-widest">
              System Architecture
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mt-2 text-hud-text">
              Three synchronized layers. One uninterrupted ride.
            </h2>
            <p className="text-sm text-hud-muted mt-3">
              Edge vision AI, low-power embedded firmware, and companion cloud telemetry working in lockstep.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tier 1 */}
            <div className="hud-card rounded-2xl p-8 border-hud-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-hud-primary font-bold">TIER 01</span>
                  <Cpu className="w-6 h-6 text-hud-primary" />
                </div>
                <h3 className="font-heading font-bold text-2xl text-hud-text mb-2">
                  Vision Coprocessor
                </h3>
                <p className="text-sm text-hud-muted leading-relaxed mb-6">
                  Wide-angle road vision detects hazards locally in real time without cellular dependence.
                </p>
              </div>
              <div className="pt-4 border-t border-hud-border/60">
                <span className="inline-block text-xs font-mono text-hud-primary bg-hud-primary/10 px-3 py-1 rounded-lg border border-hud-primary/20">
                  Banana Pi BPI-M4 · YOLOv8-nano
                </span>
              </div>
            </div>

            {/* Tier 2 */}
            <div className="hud-card rounded-2xl p-8 border-hud-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-hud-safe font-bold">TIER 02</span>
                  <HardDrive className="w-6 h-6 text-hud-safe" />
                </div>
                <h3 className="font-heading font-bold text-2xl text-hud-text mb-2">
                  Helmet Core
                </h3>
                <p className="text-sm text-hud-muted leading-relaxed mb-6">
                  Drives the AR HUD, crash sensing, and bone-conduction audio with ultra-low power consumption.
                </p>
              </div>
              <div className="pt-4 border-t border-hud-border/60">
                <span className="inline-block text-xs font-mono text-hud-safe bg-hud-safe/10 px-3 py-1 rounded-lg border border-hud-safe/20">
                  ESP32-S3 · MPU6050
                </span>
              </div>
            </div>

            {/* Tier 3 */}
            <div className="hud-card rounded-2xl p-8 border-hud-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-hud-purple font-bold">TIER 03</span>
                  <Smartphone className="w-6 h-6 text-hud-purple" />
                </div>
                <h3 className="font-heading font-bold text-2xl text-hud-text mb-2">
                  Companion App & Cloud
                </h3>
                <p className="text-sm text-hud-muted leading-relaxed mb-6">
                  Handles GPS routing, SOS dispatch, and the shared crowdsourced hazard map.
                </p>
              </div>
              <div className="pt-4 border-t border-hud-border/60">
                <span className="inline-block text-xs font-mono text-hud-purple bg-hud-purple/10 px-3 py-1 rounded-lg border border-hud-purple/20">
                  GPS · BLE · Crowdsourcing
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
          FEATURES GRID (6 CARDS)
         ========================================================================= */}
      <section id="features" className="py-24 bg-surface/20 border-t border-hud-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono text-hud-primary uppercase tracking-widest">
              Rider-First Features
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mt-2 text-hud-text">
              Less distraction. More awareness.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="hud-card rounded-2xl p-6 hover:shadow-hud-cyan transition-all">
              <div className="w-10 h-10 rounded-xl bg-surface border border-hud-border flex items-center justify-center mb-4">
                <Navigation2 className="w-5 h-5 text-hud-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-hud-text mb-2">
                AR turn-by-turn HUD
              </h3>
              <p className="text-sm text-hud-muted leading-relaxed">
                Floating directions in your peripheral vision via birdbath optics, with auto-brightness for day and night.
              </p>
            </div>

            {/* Card 2 */}
            <div className="hud-card rounded-2xl p-6 hover:shadow-hud-warning transition-all">
              <div className="w-10 h-10 rounded-xl bg-surface border border-hud-border flex items-center justify-center mb-4">
                <Scan className="w-5 h-5 text-hud-warning" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-hud-text mb-2">
                Real-time pothole detection
              </h3>
              <p className="text-sm text-hud-muted leading-relaxed">
                On-device AI scans the road ahead and flags hazards in your lane before you reach them.
              </p>
            </div>

            {/* Card 3 */}
            <div className="hud-card rounded-2xl p-6 hover:shadow-hud-hazard transition-all">
              <div className="w-10 h-10 rounded-xl bg-surface border border-hud-border flex items-center justify-center mb-4">
                <PhoneCall className="w-5 h-5 text-hud-hazard" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-hud-text mb-2">
                Automatic crash SOS
              </h3>
              <p className="text-sm text-hud-muted leading-relaxed">
                An IMU fall sensor sends your GPS location to emergency contacts, with a 10-second cancel window.
              </p>
            </div>

            {/* Card 4 */}
            <div className="hud-card rounded-2xl p-6 hover:shadow-hud-cyan transition-all">
              <div className="w-10 h-10 rounded-xl bg-surface border border-hud-border flex items-center justify-center mb-4">
                <Mic className="w-5 h-5 text-hud-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-hud-text mb-2">
                Hands-free voice control
              </h3>
              <p className="text-sm text-hud-muted leading-relaxed">
                Push-to-talk and bone-conduction audio control calls and navigation without touching your phone.
              </p>
            </div>

            {/* Card 5 */}
            <div className="hud-card rounded-2xl p-6 hover:shadow-hud-cyan transition-all">
              <div className="w-10 h-10 rounded-xl bg-surface border border-hud-border flex items-center justify-center mb-4">
                <Volume2 className="w-5 h-5 text-hud-safe" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-hud-text mb-2">
                Audio hazard ducking
              </h3>
              <p className="text-sm text-hud-muted leading-relaxed">
                Alerts and turn prompts lower your music so you never miss a warning or a horn.
              </p>
            </div>

            {/* Card 6 */}
            <div className="hud-card rounded-2xl p-6 hover:shadow-hud-purple transition-all">
              <div className="w-10 h-10 rounded-xl bg-surface border border-hud-border flex items-center justify-center mb-4">
                <Map className="w-5 h-5 text-hud-purple" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-hud-text mb-2">
                Crowdsourced hazard map
              </h3>
              <p className="text-sm text-hud-muted leading-relaxed">
                Every rider's helmet helps map potholes for the whole community, in real time.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
          INTERACTIVE HUD PREVIEW (REUSABLE COMPONENT)
         ========================================================================= */}
      <section className="py-24 border-t border-hud-border relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono text-hud-primary uppercase tracking-widest">
              Live Visor Simulator
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mt-2 text-hud-text">
              Experience the optical HUD interface
            </h2>
            <p className="text-sm text-hud-muted mt-2">
              Toggle between real-time operational states below to see how Vizor projects safety cues.
            </p>
          </div>

          <InteractiveHud panelTitle="Vizor Optical HUD Simulator" />
        </div>
      </section>


      {/* =========================================================================
          TECH SPECS & PERFORMANCE STATS
         ========================================================================= */}
      <section id="specs" className="py-24 bg-surface/30 border-t border-hud-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono text-hud-primary uppercase tracking-widest">
              Hardware & Performance
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mt-2 text-hud-text">
              Real parts. Measurable performance.
            </h2>
          </div>

          {/* Performance Numbers (Large Monospace) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="hud-card rounded-2xl p-8 text-center border-hud-border">
              <div className="font-mono text-4xl sm:text-5xl font-bold text-hud-primary mb-2">
                86.6%
              </div>
              <div className="font-heading font-semibold text-hud-text text-lg">
                Precision
              </div>
              <p className="text-xs text-hud-muted mt-1">
                Custom trained YOLOv8-nano road pothole & asphalt fault detector.
              </p>
            </div>

            <div className="hud-card rounded-2xl p-8 text-center border-hud-border">
              <div className="font-mono text-4xl sm:text-5xl font-bold text-hud-safe mb-2">
                6-10 FPS
              </div>
              <div className="font-heading font-semibold text-hud-text text-lg">
                On-device Inference
              </div>
              <p className="text-xs text-hud-muted mt-1">
                Embedded NCNN acceleration on Banana Pi BPI-M4 without cloud round-trip.
              </p>
            </div>

            <div className="hud-card rounded-2xl p-8 text-center border-hud-border">
              <div className="font-mono text-3xl sm:text-4xl font-bold text-hud-purple mb-2">
                ₹6,500-9,500
              </div>
              <div className="font-heading font-semibold text-hud-text text-lg">
                Prototype BOM Cost
              </div>
              <p className="text-xs text-hud-muted mt-1">
                ~$80-115 total Bill of Materials cost using off-the-shelf maker hardware.
              </p>
            </div>
          </div>

          {/* Hardware Component Badges */}
          <div className="hud-card rounded-2xl p-8">
            <div className="text-xs font-mono text-hud-primary uppercase tracking-wider mb-4">
              Verified Prototype Hardware Stack
            </div>
            <div className="flex flex-wrap gap-2.5">
              {[
                'ESP32-S3 Dual-Core SoC',
                'Banana Pi BPI-M4 Coprocessor',
                'YOLOv8-nano (NCNN)',
                'MPU6050 6-Axis IMU',
                'NEO-6M GPS Module',
                'SSD1306 OLED HUD Microdisplay',
                'BH1750 Ambient Light Sensor',
                'Bone-Conduction Audio Transducer',
                '3D-Printed Birdbath Optical Mount'
              ].map((spec) => (
                <span
                  key={spec}
                  className="px-3.5 py-1.5 rounded-lg bg-surface border border-hud-border text-xs font-mono text-hud-text hover:border-hud-primary transition-colors"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
          ROADMAP (3 PHASES, HORIZONTAL TIMELINE, PHASE 2 HIGHLIGHTED)
         ========================================================================= */}
      <section id="roadmap" className="py-24 border-t border-hud-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono text-hud-primary uppercase tracking-widest">
              Development Milestones
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mt-2 text-hud-text">
              From workbench to the open highway
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Phase 1: Complete */}
            <div className="hud-card rounded-2xl p-6 border-hud-safe/30 relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-hud-safe flex items-center gap-1.5 font-bold">
                  <CheckCircle className="w-4 h-4 text-hud-safe" />
                  PHASE 1 · COMPLETE
                </span>
              </div>
              <h3 className="font-heading font-semibold text-lg text-hud-text mb-2">
                Core Architecture & Firmware
              </h3>
              <p className="text-sm text-hud-muted leading-relaxed">
                ESP32-S3 firmware, FreeRTOS task scheduling, YOLOv8 edge vision pipeline, and sensor bus verification.
              </p>
            </div>

            {/* Phase 2: In Progress (Highlighted) */}
            <div className="hud-card rounded-2xl p-6 border-2 border-hud-primary shadow-hud-cyan relative bg-surface">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-hud-primary flex items-center gap-1.5 font-bold">
                  <Clock className="w-4 h-4 text-hud-primary animate-spin" />
                  PHASE 2 · IN PROGRESS
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-hud-primary/20 text-hud-primary font-bold">
                  Sep–Oct 2026
                </span>
              </div>
              <h3 className="font-heading font-semibold text-lg text-white mb-2">
                Companion App & Bench Testing
              </h3>
              <p className="text-sm text-hud-muted leading-relaxed">
                Companion app integration, hardware bench testing, 3D-printed optical mount calibration, and BLE routing protocol.
              </p>
            </div>

            {/* Phase 3: Field Testing */}
            <div className="hud-card rounded-2xl p-6 border-hud-border/70 relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-hud-muted flex items-center gap-1.5">
                  <Compass className="w-4 h-4" />
                  PHASE 3 · UPCOMING
                </span>
                <span className="text-[10px] font-mono text-hud-muted">
                  Oct–Dec 2026
                </span>
              </div>
              <h3 className="font-heading font-semibold text-lg text-hud-text mb-2">
                Field Testing & Live Ride
              </h3>
              <p className="text-sm text-hud-muted leading-relaxed">
                Real-road IMU + vision vibration testing, live ride prototype, crowdsourced hazard sync, and highway trials.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
          OPEN SOURCE & TEAM SECTION
         ========================================================================= */}
      <section className="py-24 bg-surface/30 border-t border-hud-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-hud-primary/10 border border-hud-primary/30 text-xs font-mono text-hud-primary mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Built in the Open</span>
            </div>
            
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-hud-text mb-4">
              An indie student hardware initiative
            </h2>

            <p className="text-sm sm:text-base text-hud-muted leading-relaxed mb-8">
              Vizor is an indie/student hardware project at the early prototype stage. The code and CAD files are MIT licensed, the progress is public, and the learning is shared. No venture backing — just riders building better safety gear.
            </p>

            {/* Team Avatar & Handle Chips */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              {[
                { handle: '@Kettydee', url: 'https://github.com/Kettydee' },
                { handle: '@Sanjith-Jam', url: 'https://github.com/Sanjith-Jam' },
                { handle: '@raynaagarwal01-rgb', url: 'https://github.com/raynaagarwal01-rgb' },
                { handle: '@MaximeMahieu', url: 'https://github.com/MaximeMahieu' },
              ].map((member) => (
                <a
                  key={member.handle}
                  href={member.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-surface border border-hud-border hover:border-hud-primary text-xs font-mono text-hud-text transition-all hover:scale-105"
                >
                  <div className="w-6 h-6 rounded-full bg-hud-primary/20 text-hud-primary flex items-center justify-center font-bold">
                    {member.handle[1].toUpperCase()}
                  </div>
                  <span>{member.handle}</span>
                </a>
              ))}
            </div>

            <a
              href="https://github.com/Kettydee/AI-Assisted-AR-Helmet-Navigation-System"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-hud-primary text-background font-bold text-sm shadow-hud-cyan hover:bg-hud-primary/90 transition-all"
            >
              <GithubIcon className="w-4 h-4" />
              <span>Explore GitHub Repository</span>
            </a>
          </div>
        </div>
      </section>

    </div>
  );
};
