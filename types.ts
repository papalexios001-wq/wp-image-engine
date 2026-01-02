
// types.ts - Complete type definitions with strict typing

export enum AppState {
  Welcome,
  Configuration,
  Crawling,
  Results,
}

export enum AIProvider {
  Gemini = 'Google Gemini',
  DallE3 = 'OpenAI DALL-E 3',
  Stability = 'Stability AI',
  OpenRouter = 'OpenRouter',
  Pollinations = 'Pollinations.ai (Free)',
}

export enum TextAIProvider {
  Gemini = 'Google Gemini',
  OpenAI = 'OpenAI',
  Groq = 'Groq',
  OpenRouter = 'OpenRouter',
}

export enum ImageFormat {
  WebP = 'image/webp',
  JPEG = 'image/jpeg',
  PNG = 'image/png',
}

export enum AspectRatio {
  Landscape = '16:9',
  Square = '1:1',
  Portrait = '9:16',
}

export enum ImageSize {
  K1 = '1K',
  K2 = '2K',
  K4 = '4K',
}

export type JobStatus = 
  | 'idle' 
  | 'pending' 
  | 'generating_brief' 
  | 'analyzing_placement' 
  | 'generating_image' 
  | 'uploading' 
  | 'inserting' 
  | 'setting_featured' 
  | 'updating_meta' 
  | 'analyzing' 
  | 'analysis_success' 
  | 'success' 
  | 'error' 
  | 'cancelled' 
  | 'generating_schema' 
  | 'inserting_schema' 
  | 'generating_tldr' 
  | 'inserting_tldr' 
  | 'aeo_auditing'
  | 'deleting_image'
  | 'replacing_image';

export interface WordPressCredentials {
  url: string;
  username: string;
  appPassword?: string;
}

export interface ImageSettings {
  format: ImageFormat;
  quality: number;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  style: string;
  negativePrompt: string;
  useHighQuality?: boolean;
}

export interface ImageAIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
}

export interface AnalysisAIConfig {
  provider: TextAIProvider;
  apiKey?: string;
  model?: string;
}

export interface SEOContext {
  targetLocation?: string;
  primaryKeywords?: string;
  brandVoice?: string;
  audience?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AEOAnalysis {
  score: number;
  suggestions: string[];
  qaPairs: { question: string; answer: string }[];
  serpSnippet: string;
  sources?: GroundingSource[];
}

export interface ImageAnalysis {
  score: number;
  altText: string;
  brief: string;
  caption?: string;
  filenameSlug?: string;
}

export interface GeneratedImage {
  url: string;
  alt: string;
  mediaId: number;
  brief?: string;
  caption?: string;
  filenameSlug?: string;
}

export interface Configuration {
  wordpress: WordPressCredentials;
  ai: {
    image: ImageAIConfig;
    analysis: AnalysisAIConfig;
  };
  image: ImageSettings;
  seo: SEOContext;
}

// NEW: Content image details
export interface ContentImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  position: number; // Character position in content
  paragraphIndex: number;
  isExternal: boolean;
  quality?: 'low' | 'medium' | 'high';
}

// NEW: Image insertion point
export interface InsertionPoint {
  paragraphIndex: number;
  afterElement: 'p' | 'h2' | 'h3' | 'ul' | 'ol' | 'blockquote';
  position: number;
  context: string; // Surrounding text for AI context
  recommended: boolean;
  reason?: string;
}

// NEW: Post image analysis
export interface PostImageAnalysis {
  contentImages: ContentImage[];
  insertionPoints: InsertionPoint[];
  imageGaps: number[]; // Paragraphs without images
  averageImageDistance: number;
  recommendedImageCount: number;
  qualityScore: number;
}

export interface WordPressPost {
  id: number;
  title: {
    rendered: string;
  };
  link: string;
  excerpt: {
    rendered: string;
  };
  content: {
    rendered: string;
    raw?: string; // Optional raw content if available context edit
  };
  date: string;
  modified: string;
  featured_media: number;
  imageCount: number;
  existingImageUrl?: string;
  existingImageAltText?: string;
  generatedImage?: GeneratedImage;
  analysis?: ImageAnalysis;
  aeo?: AEOAnalysis;
  seoScore?: number;
  contentWithPlaceholder?: string;
  generatedSchema?: string;
  status?: JobStatus;
  statusMessage?: string;
  // NEW: Enhanced image data
  contentImages?: ContentImage[];
  imageAnalysis?: PostImageAnalysis;
  wordCount?: number;
  paragraphCount?: number;
}

export interface CrawlProgress {
  current: number;
  total: number;
  phase?: 'fetching' | 'analyzing' | 'complete';
}

export interface Job {
  post: WordPressPost;
  action: 'generate' | 'analyze' | 'schema' | 'tldr' | 'aeo' | 'insert';
  insertionPoint?: InsertionPoint;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface TestResult {
  success: boolean;
  message: string;
}

export interface MediaUploadResult {
  id: number;
  source_url: string;
}

export interface ImageBrief {
  postId: number;
  brief: string;
  altText: string;
  caption: string;
  filenameSlug: string;
}

// NEW: Filter presets
export type FilterPreset = 
  | 'all'
  | 'no-featured'
  | 'zero-images'
  | 'low-images'
  | 'needs-work'
  | 'has-featured'
  | 'processed'
  | 'errors'
  | 'pending';

export interface FilterConfig {
  preset: FilterPreset;
  minImages?: number;
  maxImages?: number;
  hasFeatureImage?: boolean;
  minWordCount?: number;
  searchQuery?: string;
  dateRange?: { start: Date; end: Date };
}

// NEW: Batch operation
export interface BatchOperation {
  id: string;
  type: 'generate-featured' | 'insert-content' | 'analyze' | 'optimize-alt';
  postIds: number[];
  status: 'pending' | 'running' | 'paused' | 'complete' | 'cancelled';
  progress: number;
  total: number;
  startedAt?: number;
  completedAt?: number;
  errors: Array<{ postId: number; error: string }>;
}

// NEW: App stats
export interface AppStats {
  totalPosts: number;
  postsWithoutFeatured: number;
  postsWithZeroImages: number;
  postsWithLowImages: number;
  postsProcessed: number;
  totalImagesGenerated: number;
  averageImagesPerPost: number;
}
