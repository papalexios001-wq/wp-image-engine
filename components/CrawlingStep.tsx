// components/CrawlingStep.tsx - Enhanced with phase indicators

import React, { useMemo } from 'react';
import { CrawlProgress } from '../types';
import { Loader, ImageIcon, SearchIcon, CheckCircle2 } from './icons/Icons';

interface Props {
  progress: CrawlProgress;
  error?: string | null;
}

const CrawlingStep: React.FC<Props> = ({ progress, error }) => {
  const percentage = useMemo(() => {
    if (progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  }, [progress.current, progress.total]);

  const estimatedTimeRemaining = useMemo(() => {
    if (progress.current === 0 || progress.total === 0) return null;
    const remaining = progress.total - progress.current;
    const msPerItem = progress.phase === 'analyzing' ? 50 : 200;
    const seconds = Math.ceil((remaining * msPerItem) / 1000);
    if (seconds < 60) return `~${seconds}s remaining`;
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes}m remaining`;
  }, [progress.current, progress.total, progress.phase]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-surface rounded-2xl shadow-xl p-8 max-w-2xl mx-auto animate-fade-in border border-red-500/20">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Connection Error</h2>
        <p className="text-text-secondary text-center max-w-md">{error}</p>
      </div>
    );
  }

  const phases = [
    { id: 'fetching', label: 'Fetching Posts', icon: <SearchIcon className="w-5 h-5" /> },
    { id: 'analyzing', label: 'Analyzing Images', icon: <ImageIcon className="w-5 h-5" /> },
    { id: 'complete', label: 'Complete', icon: <CheckCircle2 className="w-5 h-5" /> },
  ];

  const currentPhaseIndex = phases.findIndex(p => p.id === progress.phase);

  return (
    <div className="flex flex-col items-center justify-center bg-surface rounded-2xl shadow-xl p-8 max-w-2xl mx-auto animate-fade-in border border-border">
      {/* Animated Icon */}
      <div className="relative mb-8">
        <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center">
          <Loader className="w-10 h-10 text-brand-primary animate-spin" />
        </div>
        <div className="absolute inset-0 bg-brand-primary/20 rounded-full animate-ping" />
      </div>

      {/* Phase Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {phases.map((phase, i) => (
          <React.Fragment key={phase.id}>
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold
              ${i < currentPhaseIndex ? 'bg-emerald-500/10 text-emerald-500' :
                i === currentPhaseIndex ? 'bg-brand-primary/10 text-brand-primary' :
                'bg-surface-muted text-muted'}
            `}>
              {phase.icon}
              <span className="hidden sm:inline">{phase.label}</span>
            </div>
            {i < phases.length - 1 && (
              <div className={`w-8 h-0.5 ${i < currentPhaseIndex ? 'bg-emerald-500' : 'bg-border'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-text-primary mb-2">
        {progress.phase === 'fetching' && 'Fetching Posts'}
        {progress.phase === 'analyzing' && 'Analyzing Content'}
        {progress.phase === 'complete' && 'Processing Complete'}
        {!progress.phase && 'Scanning Your Website'}
      </h2>
      <p className="text-text-secondary mb-8 text-center max-w-md">
        {progress.phase === 'fetching' && 'Retrieving posts from your WordPress site...'}
        {progress.phase === 'analyzing' && 'Scanning content for images and analyzing quality...'}
        {progress.phase === 'complete' && 'Ready to optimize your images!'}
        {!progress.phase && 'This may take a moment for large sites.'}
      </p>

      {/* Progress Bar */}
      <div className="w-full max-w-md mb-4">
        <div className="flex justify-between text-xs text-muted mb-2">
          <span>{progress.phase === 'analyzing' ? 'Analyzing' : 'Fetching'}</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-3 bg-surface-muted rounded-full overflow-hidden border border-border">
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-primary">{progress.current}</div>
          <div className="text-xs text-muted uppercase tracking-wider">
            {progress.phase === 'analyzing' ? 'Analyzed' : 'Fetched'}
          </div>
        </div>
        <div className="h-10 w-px bg-border" />
        <div className="text-center">
          <div className="text-2xl font-bold text-text-primary">{progress.total}</div>
          <div className="text-xs text-muted uppercase tracking-wider">Total</div>
        </div>
      </div>

      {/* Time Estimate */}
      {estimatedTimeRemaining && (
        <p className="mt-6 text-xs text-muted animate-pulse">{estimatedTimeRemaining}</p>
      )}

      {/* Tips */}
      <div className="mt-8 p-4 bg-surface-muted/50 rounded-xl border border-border max-w-md">
        <p className="text-xs text-muted text-center">
          💡 <strong>Tip:</strong> Posts will be sorted by image needs - those missing images appear first.
        </p>
      </div>
    </div>
  );
};

export default CrawlingStep;
