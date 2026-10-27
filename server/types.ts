// Server & Domain Type Definitions for Meta Colab

export type UserRole = 'superadmin' | 'user';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string;
  country: string;
  city: string;
  avatarUrl?: string;
  preferredLanguage: 'fr' | 'en';
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, 'passwordHash' | 'salt'>;

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export type PlanKey = 'free_test' | 'starter' | 'pro' | 'premium' | 'custom';

export interface SubscriptionPlan {
  id: string;
  key: PlanKey;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  trialDays: number;
  maxAgents: number; // -1 for unlimited
  maxPagesPerAgent: number; // -1 for unlimited
  maxPostsPerWeek: number; // -1 for unlimited
  maxPostsPerDay: number; // For free test (1 per day)
  canEditVisualPrompt: boolean;
  canEditProposals: boolean;
  canDeepCustomize: boolean;
  aiTokenMonthlyQuota: number;
  isActive: boolean;
  createdAt: string;
}

export type SubscriptionStatus = 'trialing' | 'active' | 'expired' | 'canceled';

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  trialEndsAt?: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  paymentMethod?: string;
  updatedAt: string;
}

export interface SubscriptionUsage {
  id: string;
  userId: string;
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  postsCreatedCount: number;
  postsPublishedCount: number;
  aiTokensUsed: number;
  estimatedAiCostEur: number;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  provider: 'stripe_sandbox' | 'paypal' | 'manual';
  transactionId: string;
  receiptUrl?: string;
  createdAt: string;
}

export type AIProviderType = 'gemini' | 'openai' | 'grok' | 'ollama' | 'mock';

export interface AIProviderConfig {
  id: string;
  name: string;
  providerType: AIProviderType;
  baseUrl?: string;
  encryptedApiKey?: string;
  hasApiKey: boolean;
  defaultModel: string;
  status: 'active' | 'inactive' | 'rate_limited' | 'error';
  supportedCapabilities: ('text' | 'image' | 'analysis')[];
  priority: number;
  isDefault: boolean;
  lastError?: string;
  updatedAt: string;
}

export interface AIUsageLog {
  id: string;
  userId: string;
  agentId?: string;
  providerType: AIProviderType;
  model: string;
  taskType: 'text_gen' | 'image_gen' | 'calendar_gen' | 'trend_analysis' | 'competitor_analysis';
  tokensUsed: number;
  estimatedCostEur: number;
  timestamp: string;
  success: boolean;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string;
  description: string;
  primaryGoal: string;
  businessDomain: string;
  associatedCompany: string;
  workingLanguage: 'fr' | 'en';
  tone: string;
  communicationStyle: string;
  targetAudience: string;
  skills: string[];
  businessKnowledge: string;
  customInstructions: string;
  mandatoryRules: string;
  topicsToAvoid: string;
  postingFrequency: 'daily' | '3_per_week' | '5_per_week' | 'custom';
  visualPreferences: string;
  autonomyLevel: 'supervised' | 'semi_autonomous';
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface AgentInstruction {
  id: string;
  agentId: string;
  userId: string;
  category: 'general' | 'campaign' | 'post' | 'temporary';
  title: string;
  content: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AgentConfigurationVersion {
  id: string;
  agentId: string;
  versionNumber: number;
  snapshotData: Partial<Agent>;
  reason: string;
  createdAt: string;
}

export type SocialPlatform = 'facebook' | 'instagram';
export type SocialConnectionStatus = 'connected' | 'expired' | 'invalid_permissions' | 'disconnected';

export interface SocialAccount {
  id: string;
  userId: string;
  platform: SocialPlatform;
  externalUserId: string;
  name: string;
  profilePictureUrl?: string;
  email?: string;
  encryptedAccessToken: string;
  tokenExpiresAt?: string;
  scopes: string[];
  status: SocialConnectionStatus;
  lastCheckedAt: string;
  lastError?: string;
  createdAt: string;
}

export interface SocialPage {
  id: string;
  userId: string;
  socialAccountId: string;
  platform: SocialPlatform;
  externalPageId: string;
  name: string;
  category: string;
  profilePictureUrl?: string;
  encryptedAccessToken?: string;
  followersCount: number;
  timeZone: string;
  targetAudience: string;
  editorialGuidelines: string;
  preferredHours: string[];
  status: 'active' | 'disconnected';
  createdAt: string;
}

export interface AgentPageAssignment {
  id: string;
  agentId: string;
  pageId: string;
  userId: string;
  assignedAt: string;
}

export interface BrandProfile {
  id: string;
  userId: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontTitle: string;
  fontBody: string;
  logoUrl?: string;
  brandVoice: string;
  visualStyle: string;
  negativePrompts: string;
  doNotMention: string;
  guidelines: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspirationAsset {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: 'product' | 'lifestyle' | 'quote' | 'infographic' | 'behind_the_scenes' | 'event';
  tags: string[];
  fileUrl: string;
  instructions: string;
  associatedAgentId?: string;
  associatedPageId?: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  objective: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'draft';
  createdAt: string;
}

export interface EditorialCalendar {
  id: string;
  userId: string;
  pageId: string;
  agentId: string;
  weekNumber: number;
  year: number;
  title: string;
  status: 'draft' | 'pending_review' | 'approved' | 'in_progress' | 'completed';
  generatedAt: string;
  approvedAt?: string;
}

export type PostFormat = 'single_image' | 'carousel' | 'reel' | 'educational' | 'story' | 'link_post';

export interface EditorialCalendarItem {
  id: string;
  calendarId: string;
  pageId: string;
  agentId: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  timeZone: string;
  objective: string;
  theme: string;
  format: PostFormat;
  editorialAngle: string;
  summary: string;
  callToAction: string;
  status: 'suggested' | 'approved' | 'rejected' | 'post_generated';
  postId?: string;
}

export type PostStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

export interface Post {
  id: string;
  userId: string;
  pageId: string;
  agentId: string;
  calendarItemId?: string;
  platform: SocialPlatform;
  contentFormatted: string; // Rich format with markdown/html
  contentRawText: string;   // Clean unicode text for Meta Graph API
  visualPrompt: string;
  visualUrl: string;
  visualVersions: { id: string; url: string; prompt: string; createdAt: string }[];
  format: PostFormat;
  callToAction: string;
  hashtags: string[];
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  timeZone: string;
  status: PostStatus;
  approvalRequired: boolean; // MANDATORY: always true
  approvedByUserId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  versionNumber: number;
  idempotencyKey: string;
  publishedAt?: string;
  metaExternalPostId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostVersion {
  id: string;
  postId: string;
  versionNumber: number;
  contentFormatted: string;
  contentRawText: string;
  visualPrompt: string;
  visualUrl: string;
  modifiedByUserId: string;
  changeReason: string;
  createdAt: string;
}

export interface ScheduledJob {
  id: string;
  postId: string;
  pageId: string;
  scheduledFor: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  lockKey?: string;
  lockedAt?: string;
  attemptsCount: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: string;
}

export interface PublicationAttempt {
  id: string;
  postId: string;
  pageId: string;
  timestamp: string;
  status: 'success' | 'failed';
  responsePayload?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface Competitor {
  id: string;
  userId: string;
  name: string;
  pageUrl: string;
  platform: SocialPlatform;
  industry: string;
  notes: string;
  createdAt: string;
}

export interface CompetitorAnalysis {
  id: string;
  userId: string;
  competitorId: string;
  analysisDate: string;
  observedFrequency: string;
  contentThemes: string[];
  popularFormats: string[];
  publicStrengths: string[];
  detectedGaps: string[];
  recommendations: string[];
  rawSummary: string;
}

export interface TrendReport {
  id: string;
  userId: string;
  domain: string;
  generatedAt: string;
  trendingTopics: { topic: string; relevance: number; angle: string }[];
  seasonalThemes: string[];
  suggestedHooks: string[];
}

export interface PerformanceMetric {
  id: string;
  userId: string;
  pageId: string;
  postId?: string;
  platform: SocialPlatform;
  reach: number;
  impressions: number;
  reactions: number;
  comments: number;
  shares: number;
  clicks: number;
  engagementRate: number;
  collectedAt: string;
  isSimulatedOrEstimated: boolean;
}

export interface Recommendation {
  id: string;
  userId: string;
  agentId?: string;
  pageId?: string;
  category: 'timing' | 'format' | 'copy' | 'frequency' | 'trend';
  title: string;
  explanation: string;
  suggestedAction: string;
  status: 'open' | 'applied' | 'dismissed';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | 'calendar_generated'
    | 'post_ready_approval'
    | 'post_published'
    | 'post_failed'
    | 'token_expiring'
    | 'quota_reached'
    | 'subscription_update'
    | 'admin_message';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  userId?: string;
  recipient: string;
  subject: string;
  template: string;
  status: 'sent' | 'failed' | 'queued';
  errorMessage?: string;
  sentAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  subject: string;
  status: 'open' | 'waiting_admin' | 'resolved';
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'user' | 'admin';
  text: string;
  attachments?: string[];
  read: boolean;
  createdAt: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}
