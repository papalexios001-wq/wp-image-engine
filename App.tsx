
// App.tsx - Optimized with code splitting, lazy loading, and keyboard shortcuts

import React, { useState, useCallback, useEffect, useMemo, Suspense, lazy } from 'react';
import { AppState, Configuration, CrawlProgress, WordPressPost, AppStats } from './types';
import { AppIcon, GeminiIcon, SunIcon, MoonIcon, Loader, KeyboardIcon } from './components/icons/Icons';
import { getTotalPosts, fetchAllPostsParallel, analyzePostImages } from './services/wordpressService';
import { startCacheCleanup, stopCacheCleanup } from './services/cache';
import { getErrorMessage } from './services/errors';
import { usePersistence } from './hooks/usePersistence';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load heavy components
const WelcomeStep = lazy(() => import('./components/WelcomeStep'));
const ConfigurationStep = lazy(() => import('./components/ConfigurationStep'));
const CrawlingStep = lazy(() => import('./components/CrawlingStep'));
const ResultsStep = lazy(() => import('./components/ResultsStep'));
const KeyboardShortcutsModal = lazy(() => import('./components/KeyboardShortcutsModal'));

// Loading fallback
const StepLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] bg-surface rounded-2xl border border-border">
    <Loader className="w-12 h-12 text-brand-primary animate-spin mb-4" />
    <p className="text-text-secondary font-medium">Loading...</p>
  </div>
);

// Theme hook
const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme');
      if (storedTheme) return storedTheme;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, toggleTheme };
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.Welcome);
  const [config, setConfig] = useState<Configuration | null>(null);
  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [crawlProgress, setCrawlProgress] = useState<CrawlProgress>({ current: 0, total: 0, phase: 'fetching' });
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  const { theme, toggleTheme } = useTheme();
  const persistence = usePersistence();

  // Calculate app stats
  const appStats = useMemo<AppStats>(() => {
    const totalPosts = posts.length;
    const postsWithoutFeatured = posts.filter(p => p.featured_media === 0 && !p.generatedImage).length;
    const postsWithZeroImages = posts.filter(p => p.imageCount === 0).length;
    const postsWithLowImages = posts.filter(p => p.imageCount > 0 && p.imageCount < 3).length;
    const postsProcessed = posts.filter(p => p.status === 'success').length;
    const totalImages = posts.reduce((sum, p) => sum + p.imageCount, 0);
    
    return {
      totalPosts,
      postsWithoutFeatured,
      postsWithZeroImages,
      postsWithLowImages,
      postsProcessed,
      totalImagesGenerated: postsProcessed,
      averageImagesPerPost: totalPosts > 0 ? totalImages / totalPosts : 0,
    };
  }, [posts]);

  // Start cache cleanup on mount
  useEffect(() => {
    startCacheCleanup();
    return () => stopCacheCleanup();
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'shift+?': () => setShowShortcuts(true),
    'escape': () => setShowShortcuts(false),
    'alt+t': toggleTheme,
    'alt+h': () => setAppState(AppState.Welcome),
    'alt+c': () => config && setAppState(AppState.Configuration),
  });

  // Optimized crawling with parallel fetching and image analysis
  const handleStartCrawling = useCallback(async (newConfig: Configuration) => {
    setConfig(newConfig);
    setAppState(AppState.Crawling);
    setPosts([]);
    setCrawlError(null);
    
    persistence.saveConfig(newConfig);
    
    const abortController = new AbortController();

    try {
      // Phase 1: Get total count
      const total = await getTotalPosts(
        newConfig.wordpress.url,
        newConfig.wordpress.username,
        newConfig.wordpress.appPassword,
        abortController.signal
      );
      
      setCrawlProgress({ current: 0, total, phase: 'fetching' });

      // Phase 2: Fetch all posts with parallel requests
      // SOTA CONFIG: Lower batch size (20) and concurrency (3) to prevent 504 timeouts on shared hosting
      const allPosts = await fetchAllPostsParallel(
        newConfig.wordpress.url,
        newConfig.wordpress.username,
        newConfig.wordpress.appPassword,
        total,
        20, // Reduced from 100 for stability
        (loaded, totalPosts) => {
          setCrawlProgress({ current: loaded, total: totalPosts, phase: 'fetching' });
        },
        abortController.signal,
        3 // Reduced from 6 for stability
      );

      // Phase 3: Analyze images in content (parallel batched)
      setCrawlProgress({ current: 0, total: allPosts.length, phase: 'analyzing' });
      
      const analyzedPosts = await analyzePostImages(
        allPosts,
        (analyzed) => {
          setCrawlProgress({ current: analyzed, total: allPosts.length, phase: 'analyzing' });
        }
      );

      // Sort: prioritize posts that need work
      const sortedPosts = analyzedPosts.sort((a, b) => {
        // Priority score: higher = needs more work
        const getScore = (p: WordPressPost) => {
          let score = 0;
          if (p.featured_media === 0) score += 1000; // No featured image
          if (p.imageCount === 0) score += 500; // Zero content images
          else if (p.imageCount < 3) score += 200; // Low images
          score += (100 - Math.min(p.imageCount * 10, 100)); // Fewer images = higher score
          return score;
        };
        return getScore(b) - getScore(a);
      });

      setPosts(sortedPosts);
      persistence.savePosts(sortedPosts);
      setCrawlProgress({ current: total, total, phase: 'complete' });
      setAppState(AppState.Results);
      
    } catch (error) {
      console.error("Crawling failed:", error);
      const message = getErrorMessage(error);
      setCrawlError(message);
      setAppState(AppState.Configuration);
    }
  }, [persistence]);

  const handleReset = useCallback(() => {
    setAppState(AppState.Welcome);
    setConfig(null);
    setPosts([]);
    setCrawlProgress({ current: 0, total: 0 });
    setCrawlError(null);
    persistence.clearAll();
  }, [persistence]);

  const handleBackToConfig = useCallback(() => {
    setAppState(AppState.Configuration);
  }, []);

  const handleUpdatePosts = useCallback((updatedPosts: WordPressPost[]) => {
    setPosts(updatedPosts);
    persistence.savePosts(updatedPosts);
  }, [persistence]);

  // Memoized content renderer with Suspense
  const content = useMemo(() => {
    const renderContent = () => {
      switch (appState) {
        case AppState.Welcome:
          return <WelcomeStep onGetStarted={() => setAppState(AppState.Configuration)} />;
        case AppState.Configuration:
          return (
            <ConfigurationStep 
              onConfigure={handleStartCrawling} 
              initialConfig={persistence.loadConfig() ?? undefined}
            />
          );
        case AppState.Crawling:
          return <CrawlingStep progress={crawlProgress} error={crawlError} />;
        case AppState.Results:
          return config ? (
            <ResultsStep 
              initialPosts={posts} 
              config={config} 
              onReset={handleReset}
              onBackToConfig={handleBackToConfig}
              onUpdatePosts={handleUpdatePosts}
              persistence={persistence}
              appStats={appStats}
            />
          ) : null;
        default:
          return <div>Unknown state</div>;
      }
    };

    return (
      <ErrorBoundary
        fallback={(error, reset) => (
          <div className="bg-surface rounded-2xl p-8 border border-red-500/20 text-center">
            <h2 className="text-xl font-bold text-red-500 mb-4">Something went wrong</h2>
            <p className="text-text-secondary mb-4">{error.message}</p>
            <button 
              onClick={reset}
              className="px-6 py-2 bg-brand-primary text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        )}
        resetKeys={[appState]}
      >
        <Suspense fallback={<StepLoader />}>
          {renderContent()}
        </Suspense>
      </ErrorBoundary>
    );
  }, [appState, config, posts, crawlProgress, crawlError, handleStartCrawling, handleReset, handleBackToConfig, handleUpdatePosts, persistence, appStats]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-7xl mx-auto flex justify-between items-center mb-6 pb-4 border-b border-border">
        <div>
          <button 
            onClick={handleReset}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <AppIcon className="h-9 w-9" />
            <span className="text-2xl font-bold text-text-primary tracking-tight">AI Image Engine</span>
          </button>
          <a 
            href="https://affiliatemarketingforsuccess.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-muted hover:text-brand-primary transition-colors ml-12 -mt-1 block"
          >
            From the creators of AffiliateMarketingForSuccess.com
          </a>
        </div>
        <div className="flex items-center space-x-4">
          {/* Quick Stats Badge */}
          {appState === AppState.Results && (
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-surface-muted rounded-xl border border-border text-xs">
              <span className="text-amber-500 font-bold">{appStats.postsWithoutFeatured} missing</span>
              <span className="text-red-500 font-bold">{appStats.postsWithZeroImages} empty</span>
              <span className="text-emerald-500 font-bold">{appStats.postsProcessed} done</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-sm text-muted">
            <span>Powered by</span>
            <GeminiIcon className="h-6 w-6" />
          </div>
          
          <button
            onClick={() => setShowShortcuts(true)}
            className="p-2 rounded-full bg-surface-muted hover:bg-border text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (Shift+?)"
          >
            <KeyboardIcon className="h-5 w-5" />
          </button>
          
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full bg-surface-muted hover:bg-border text-text-secondary hover:text-text-primary transition-colors"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto flex-grow">
        {content}
      </main>

      <footer className="w-full max-w-7xl mx-auto mt-12 py-8 border-t border-border text-center text-sm text-muted">
        <div className="flex flex-col items-center gap-4">
          <a href="https://affiliatemarketingforsuccess.com" target="_blank" rel="noopener noreferrer">
            <img 
              src="https://affiliatemarketingforsuccess.com/wp-content/uploads/2023/03/cropped-Affiliate-Marketing-for-Success-Logo-Edited.png?lm=6666FEE0" 
              alt="Affiliate Marketing for Success Logo" 
              className="h-16 w-auto mb-2 hover:opacity-80 transition-opacity"
              loading="lazy"
            />
          </a>
          <p>
            Created by Alexios Papaioannou, Owner of{' '}
            <a 
              href="https://affiliatemarketingforsuccess.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-semibold text-text-secondary hover:text-brand-primary transition-colors"
            >
              affiliatemarketingforsuccess.com
            </a>
          </p>
          <p className="text-xs text-muted">
            Press <kbd className="px-1.5 py-0.5 bg-surface-muted rounded border border-border text-[10px]">Shift</kbd> + <kbd className="px-1.5 py-0.5 bg-surface-muted rounded border border-border text-[10px]">?</kbd> for keyboard shortcuts
          </p>
        </div>
      </footer>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <Suspense fallback={null}>
          <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
        </Suspense>
      )}
    </div>
  );
};

export default App;
