import fs from 'fs';
import path from 'path';
import { createPool } from 'mysql2/promise';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import {
  User,
  Session,
  SubscriptionPlan,
  Subscription,
  SubscriptionUsage,
  Payment,
  AIProviderConfig,
  AIUsageLog,
  Agent,
  AgentInstruction,
  AgentConfigurationVersion,
  SocialAccount,
  SocialPage,
  AgentPageAssignment,
  BrandProfile,
  InspirationAsset,
  Campaign,
  EditorialCalendar,
  EditorialCalendarItem,
  Post,
  PostVersion,
  ScheduledJob,
  PublicationAttempt,
  Competitor,
  CompetitorAnalysis,
  TrendReport,
  PerformanceMetric,
  Recommendation,
  Notification,
  EmailLog,
  Conversation,
  Message,
  SystemSetting,
  AuditLog,
} from './types.js';
import { hashPassword, encryptSecret } from './security.js';

interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  plans: SubscriptionPlan[];
  subscriptions: Subscription[];
  usages: SubscriptionUsage[];
  payments: Payment[];
  aiProviders: AIProviderConfig[];
  aiUsageLogs: AIUsageLog[];
  agents: Agent[];
  agentInstructions: AgentInstruction[];
  agentVersions: AgentConfigurationVersion[];
  socialAccounts: SocialAccount[];
  socialPages: SocialPage[];
  assignments: AgentPageAssignment[];
  brandProfiles: BrandProfile[];
  inspirationAssets: InspirationAsset[];
  campaigns: Campaign[];
  calendars: EditorialCalendar[];
  calendarItems: EditorialCalendarItem[];
  posts: Post[];
  postVersions: PostVersion[];
  scheduledJobs: ScheduledJob[];
  attempts: PublicationAttempt[];
  competitors: Competitor[];
  competitorAnalyses: CompetitorAnalysis[];
  trendReports: TrendReport[];
  metrics: PerformanceMetric[];
  recommendations: Recommendation[];
  notifications: Notification[];
  emailLogs: EmailLog[];
  conversations: Conversation[];
  messages: Message[];
  settings: SystemSetting[];
  auditLogs: AuditLog[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'metacolab_db.json');

class DatabaseStore {
  private data: DatabaseSchema;
  private isSaving = false;
  private mysqlPool: Pool | null = null;
  private mysqlSaveQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.data = this.createEmptySchema();
    if (!this.isMySqlConfigured()) {
      this.init();
    }
  }

  private isMySqlConfigured() {
    const databaseUrl = process.env.DATABASE_URL?.trim().toLowerCase();
    return databaseUrl === 'mysql' || databaseUrl?.startsWith('mysql://') === true;
  }

  public async initialize() {
    if (!this.isMySqlConfigured()) return;

    const configuredUrl = process.env.DATABASE_URL!.trim();
    const databaseUrl = configuredUrl.toLowerCase().startsWith('mysql://')
      ? new URL(configuredUrl)
      : null;
    const databaseName = databaseUrl
      ? decodeURIComponent(databaseUrl.pathname.slice(1))
      : process.env.DB_NAME || process.env.MYSQL_DATABASE || 'ia_agent_studio';
    if (!databaseName) {
      throw new Error('Set DB_NAME or include a database name in DATABASE_URL.');
    }

    const pool = createPool({
      host: databaseUrl?.hostname || process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
      port: Number(databaseUrl?.port || process.env.DB_PORT || process.env.MYSQL_PORT) || 3306,
      user: decodeURIComponent(databaseUrl?.username || process.env.DB_USER || process.env.MYSQL_USER || 'root'),
      password: decodeURIComponent(
        databaseUrl?.password || process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
      ),
      database: databaseName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
    this.mysqlPool = pool;

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS metacolab_state (
        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        payload LONGTEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        email VARCHAR(191) NOT NULL UNIQUE,
        password_hash CHAR(128) NOT NULL,
        salt CHAR(32) NOT NULL,
        first_name VARCHAR(191) NOT NULL,
        last_name VARCHAR(191) NOT NULL,
        company_name VARCHAR(191) NOT NULL,
        phone VARCHAR(64) NULL,
        country VARCHAR(191) NOT NULL,
        city VARCHAR(191) NOT NULL,
        avatar_url TEXT NULL,
        preferred_language VARCHAR(2) NOT NULL DEFAULT 'fr',
        role VARCHAR(32) NOT NULL DEFAULT 'user',
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        email_verified TINYINT(1) NOT NULL DEFAULT 0,
        created_at VARCHAR(40) NOT NULL,
        updated_at VARCHAR(40) NOT NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    const [rows] = await pool.query<Array<RowDataPacket & { payload: string }>>(
      'SELECT payload FROM metacolab_state WHERE id = 1 LIMIT 1',
    );
    const row = rows[0];

    if (row) {
      this.data = { ...this.createEmptySchema(), ...JSON.parse(row.payload) };
      await this.saveToMySql(pool);
      console.log(`[Database] Loaded application data from MySQL database "${databaseName}".`);
      return;
    }

    if (fs.existsSync(DB_FILE)) {
      const existingData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      this.data = { ...this.createEmptySchema(), ...existingData };
      console.log(`[Database] Migrating existing application data to MySQL database "${databaseName}".`);
    } else {
      this.data = this.createEmptySchema();
      this.seedInitialData();
      console.log(`[Database] Initialized MySQL database "${databaseName}" with default data.`);
    }

    await this.saveToMySql(pool);
  }

  private async saveToMySql(pool: Pool) {
    const payload = JSON.stringify(this.data);
    await pool.execute(
      `INSERT INTO metacolab_state (id, payload) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
      [payload],
    );

    for (const user of this.data.users) {
      await pool.execute(
        `INSERT INTO users (
          id, email, password_hash, salt, first_name, last_name, company_name,
          phone, country, city, avatar_url, preferred_language, role, status,
          email_verified, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          email = VALUES(email),
          password_hash = VALUES(password_hash),
          salt = VALUES(salt),
          first_name = VALUES(first_name),
          last_name = VALUES(last_name),
          company_name = VALUES(company_name),
          phone = VALUES(phone),
          country = VALUES(country),
          city = VALUES(city),
          avatar_url = VALUES(avatar_url),
          preferred_language = VALUES(preferred_language),
          role = VALUES(role),
          status = VALUES(status),
          email_verified = VALUES(email_verified),
          updated_at = VALUES(updated_at)`,
        [
          user.id,
          user.email,
          user.passwordHash,
          user.salt,
          user.firstName,
          user.lastName,
          user.companyName,
          user.phone || null,
          user.country,
          user.city,
          user.avatarUrl || null,
          user.preferredLanguage,
          user.role,
          user.status,
          user.emailVerified ? 1 : 0,
          user.createdAt,
          user.updatedAt,
        ],
      );
    }
  }

  private enqueueMySqlSave(): Promise<void> {
    const pool = this.mysqlPool;
    if (!pool) return Promise.resolve();

    const save = this.mysqlSaveQueue.then(() => this.saveToMySql(pool));
    this.mysqlSaveQueue = save.catch((err: unknown) => {
      console.error('Error persisting application data to MySQL:', err);
    });
    return save;
  }

  public async persistAndWait() {
    if (this.mysqlPool) {
      await this.enqueueMySqlSave();
      return;
    }

    this.persist();
  }

  private createEmptySchema(): DatabaseSchema {
    return {
      users: [],
      sessions: [],
      plans: [],
      subscriptions: [],
      usages: [],
      payments: [],
      aiProviders: [],
      aiUsageLogs: [],
      agents: [],
      agentInstructions: [],
      agentVersions: [],
      socialAccounts: [],
      socialPages: [],
      assignments: [],
      brandProfiles: [],
      inspirationAssets: [],
      campaigns: [],
      calendars: [],
      calendarItems: [],
      posts: [],
      postVersions: [],
      scheduledJobs: [],
      attempts: [],
      competitors: [],
      competitorAnalyses: [],
      trendReports: [],
      metrics: [],
      recommendations: [],
      notifications: [],
      emailLogs: [],
      conversations: [],
      messages: [],
      settings: [],
      auditLogs: [],
    };
  }

  private init() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = { ...this.createEmptySchema(), ...JSON.parse(raw) };
      } else {
        this.data = this.createEmptySchema();
        this.seedInitialData();
        this.persist();
      }
    } catch (err) {
      console.error('Error loading database file, initializing clean state with seeds:', err);
      this.data = this.createEmptySchema();
      this.seedInitialData();
      this.persist();
    }
  }

  public persist() {
    if (this.isSaving) return;
    if (this.mysqlPool) {
      void this.enqueueMySqlSave().catch((err: unknown) => {
        console.error('Error persisting application data to MySQL:', err);
      });
      return;
    }

    this.isSaving = true;
    try {
      const serialized = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(DB_FILE, serialized, 'utf8');
    } catch (err) {
      console.error('Error persisting database:', err);
    } finally {
      this.isSaving = false;
    }
  }

  private seedInitialData() {
    const now = new Date().toISOString();

    // 1. Subscription Plans (Free Test, Starter, Pro, Premium)
    const plans: SubscriptionPlan[] = [
      {
        id: 'plan_free_test',
        key: 'free_test',
        name: 'Pack Free Test',
        description: 'Période d’essai de 7 jours pour tester les agents IA sur une page Facebook avec 1 publication quotidienne.',
        price: 0,
        currency: 'EUR',
        billingPeriod: 'monthly',
        trialDays: 7,
        maxAgents: 1,
        maxPagesPerAgent: 1,
        maxPostsPerWeek: 7,
        maxPostsPerDay: 1,
        canEditVisualPrompt: false,
        canEditProposals: true,
        canDeepCustomize: false,
        aiTokenMonthlyQuota: 25000,
        isActive: true,
        createdAt: now,
      },
      {
        id: 'plan_starter',
        key: 'starter',
        name: 'Pack Starter',
        description: 'Idéal pour démarrer : 1 agent IA, 1 page Facebook, jusqu’à 14 publications par semaine avec modifications.',
        price: 29,
        currency: 'EUR',
        billingPeriod: 'monthly',
        trialDays: 0,
        maxAgents: 1,
        maxPagesPerAgent: 1,
        maxPostsPerWeek: 14,
        maxPostsPerDay: 2,
        canEditVisualPrompt: false,
        canEditProposals: true,
        canDeepCustomize: false,
        aiTokenMonthlyQuota: 100000,
        isActive: true,
        createdAt: now,
      },
      {
        id: 'plan_pro',
        key: 'pro',
        name: 'Pack Pro',
        description: 'Pour les marques en croissance : 3 agents IA, 3 pages par agent, 21 publications/semaine, personnalisation des prompts visuels.',
        price: 79,
        currency: 'EUR',
        billingPeriod: 'monthly',
        trialDays: 0,
        maxAgents: 3,
        maxPagesPerAgent: 3,
        maxPostsPerWeek: 21,
        maxPostsPerDay: 4,
        canEditVisualPrompt: true,
        canEditProposals: true,
        canDeepCustomize: true,
        aiTokenMonthlyQuota: 300000,
        isActive: true,
        createdAt: now,
      },
      {
        id: 'plan_premium',
        key: 'premium',
        name: 'Pack Premium',
        description: 'Agents illimités, pages illimitées, volume illimité, personnalisation poussée des compétences et priorité absolue.',
        price: 199,
        currency: 'EUR',
        billingPeriod: 'monthly',
        trialDays: 0,
        maxAgents: 9999,
        maxPagesPerAgent: 9999,
        maxPostsPerWeek: 9999,
        maxPostsPerDay: 9999,
        canEditVisualPrompt: true,
        canEditProposals: true,
        canDeepCustomize: true,
        aiTokenMonthlyQuota: 1000000,
        isActive: true,
        createdAt: now,
      },
    ];
    this.data.plans = plans;

    // 2. AI Providers Configuration
    const geminiKey = process.env.GEMINI_API_KEY || '';
    const openAIKey = process.env.OPENAI_API_KEY || '';
    const grokKey = process.env.GROK_API_KEY || '';

    this.data.aiProviders = [
      {
        id: 'prov_gemini',
        name: 'Google Gemini AI',
        providerType: 'gemini',
        baseUrl: 'https://generativelanguage.googleapis.com',
        encryptedApiKey: geminiKey ? encryptSecret(geminiKey) : '',
        hasApiKey: Boolean(geminiKey),
        defaultModel: 'gemini-2.5-flash',
        status: 'active',
        supportedCapabilities: ['text', 'image', 'analysis'],
        priority: 1,
        isDefault: true,
        updatedAt: now,
      },
      {
        id: 'prov_openai',
        name: 'OpenAI (GPT-4o & DALL-E 3)',
        providerType: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        encryptedApiKey: openAIKey ? encryptSecret(openAIKey) : '',
        hasApiKey: Boolean(openAIKey),
        defaultModel: 'gpt-4o',
        status: openAIKey ? 'active' : 'inactive',
        supportedCapabilities: ['text', 'image', 'analysis'],
        priority: 2,
        isDefault: false,
        updatedAt: now,
      },
      {
        id: 'prov_grok',
        name: 'xAI Grok',
        providerType: 'grok',
        baseUrl: 'https://api.x.ai/v1',
        encryptedApiKey: grokKey ? encryptSecret(grokKey) : '',
        hasApiKey: Boolean(grokKey),
        defaultModel: 'grok-2-latest',
        status: grokKey ? 'active' : 'inactive',
        supportedCapabilities: ['text', 'analysis'],
        priority: 3,
        isDefault: false,
        updatedAt: now,
      },
      {
        id: 'prov_ollama',
        name: 'Ollama Local Instance',
        providerType: 'ollama',
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        hasApiKey: false,
        defaultModel: 'llama3:8b',
        status: 'inactive',
        supportedCapabilities: ['text', 'analysis'],
        priority: 4,
        isDefault: false,
        updatedAt: now,
      },
    ];

    // 3. Demo SuperAdmin & Demo User
    const adminPassword = process.env.DEMO_ADMIN_PASSWORD || 'AdminMetaColab2026!';
    const userPassword = process.env.DEMO_USER_PASSWORD || 'DemoUser2026!';

    const adminCreds = hashPassword(adminPassword);
    const userCreds = hashPassword(userPassword);

    const superAdmin: User = {
      id: 'usr_admin_001',
      email: 'admin@metacolab.io',
      passwordHash: adminCreds.hash,
      salt: adminCreds.salt,
      firstName: 'Alexandre',
      lastName: 'Dubois',
      companyName: 'Meta Colab Platform HQ',
      phone: '+33 1 42 68 00 00',
      country: 'France',
      city: 'Paris',
      preferredLanguage: 'fr',
      role: 'superadmin',
      status: 'active',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    };

    const demoUser: User = {
      id: 'usr_demo_002',
      email: 'demo@metacolab.io',
      passwordHash: userCreds.hash,
      salt: userCreds.salt,
      firstName: 'Camille',
      lastName: 'Laurent',
      companyName: 'Atelier Créatif Paris',
      phone: '+33 6 12 34 56 78',
      country: 'France',
      city: 'Paris',
      preferredLanguage: 'fr',
      role: 'user',
      status: 'active',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    };

    this.data.users = [superAdmin, demoUser];

    // Admin subscription (unlimited)
    this.data.subscriptions.push({
      id: 'sub_admin',
      userId: superAdmin.id,
      planId: 'plan_premium',
      status: 'active',
      startDate: now,
      currentPeriodEnd: new Date(Date.now() + 365 * 86400000).toISOString(),
      autoRenew: true,
      paymentMethod: 'system_admin',
      updatedAt: now,
    });

    // Demo user subscription (Pro plan active)
    const proPlanExpiry = new Date(Date.now() + 30 * 86400000).toISOString();
    this.data.subscriptions.push({
      id: 'sub_demo_001',
      userId: demoUser.id,
      planId: 'plan_pro',
      status: 'active',
      startDate: now,
      currentPeriodEnd: proPlanExpiry,
      autoRenew: true,
      paymentMethod: 'visa_4242',
      updatedAt: now,
    });

    // Demo user usage tracker
    this.data.usages.push({
      id: 'usage_demo_001',
      userId: demoUser.id,
      subscriptionId: 'sub_demo_001',
      periodStart: now,
      periodEnd: proPlanExpiry,
      postsCreatedCount: 14,
      postsPublishedCount: 8,
      aiTokensUsed: 42150,
      estimatedAiCostEur: 0.84,
    });

    // 4. Brand Profile for Demo User
    this.data.brandProfiles.push({
      id: 'bp_demo_001',
      userId: demoUser.id,
      brandName: 'Atelier Créatif Paris',
      primaryColor: '#2563EB',
      secondaryColor: '#7C3AED',
      accentColor: '#10B981',
      fontTitle: 'Plus Jakarta Sans',
      fontBody: 'Inter',
      logoUrl: '',
      brandVoice: 'Élégant, inspirant, accessible, expert en design d’intérieur et artisanat contemporain.',
      visualStyle: 'Lumière naturelle, tons chauds bois et lin, composition épurée minimaliste haut de gamme.',
      negativePrompts: 'Texte flou, sur-saturation, éléments bon marché, personnages déformés, basse résolution.',
      doNotMention: 'Prix discount, concurrence agressive, termes négatifs, langage familier.',
      guidelines: 'Chaque visuel doit refléter l’excellence du savoir-faire parisien et susciter l’émotion.',
      createdAt: now,
      updatedAt: now,
    });

    // 5. AI Agents for Demo User
    const agent1: Agent = {
      id: 'agent_sophie',
      userId: demoUser.id,
      name: 'Sophie - Directrice Éditoriale',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      description: 'Stratège contenu experte en storytelling, engagement communautaire et valorisation de marque.',
      primaryGoal: 'Développer la notoriété et convertir l’audience en clients fidèles pour l’Atelier.',
      businessDomain: 'Design d’intérieur, mobilier d’art et décoration haut de gamme',
      associatedCompany: 'Atelier Créatif Paris',
      workingLanguage: 'fr',
      tone: 'Professionnel, chaleureux, inspirant et pédagogue',
      communicationStyle: 'Storytelling immersif avec appels à l’action élégants',
      targetAudience: 'Amateurs de design, architectes d’intérieur, CSP+ 30-55 ans passionnés d’artisanat',
      skills: [
        'Storytelling de marque',
        'Rédaction commerciale persuasive',
        'Création de calendriers éditoriaux',
        'Analyse des tendances déco',
        'Communication éducative & conseils d’experts',
      ],
      businessKnowledge: 'Maîtrise des essences de bois nobles, finitions artisanales, tendances éco-conçues 2026.',
      customInstructions: 'Toujours intégrer un détail technique authentique sur le processus de fabrication artisanale.',
      mandatoryRules: 'Validation humaine obligatoire avant toute programmation. Aucun texte non relu.',
      topicsToAvoid: 'Promotions agressives, polémiques, vocabulaire trop familier.',
      postingFrequency: 'daily',
      visualPreferences: 'Photographie architecturale épurée, gros plans sur les textures naturelles.',
      autonomyLevel: 'supervised',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const agent2: Agent = {
      id: 'agent_lucas',
      userId: demoUser.id,
      name: 'Lucas - Spécialiste Tendances & Reels',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      description: 'Expert formats courts, carrousels éducatifs et veille concurrentielle active.',
      primaryGoal: 'Maximiser la portée organique sur Instagram et attirer une audience jeune et prescriptrice.',
      businessDomain: 'Tendances design, coulisses d’atelier, DIY haut de gamme',
      associatedCompany: 'Atelier Créatif Paris',
      workingLanguage: 'fr',
      tone: 'Dynamique, captivant, moderne et complice',
      communicationStyle: 'Accroches percutantes (hooks), rythme soutenu, visuels graphiques forts',
      targetAudience: 'Créateurs, jeunes propriétaires, décorateurs émergents 25-45 ans',
      skills: [
        'Scénarisation de Reels & formats verticaux',
        'Carrousels tutoriaux étape par étape',
        'Recherche de hashtags à forte viralité',
        'Analyse comparative de la concurrence',
      ],
      businessKnowledge: 'Algorithmes Meta 2026, métriques d’attention, formats vidéo courts.',
      customInstructions: 'Proposer systématiquement un hook percutant de moins de 3 secondes pour les vidéos.',
      mandatoryRules: 'Soumission obligatoire à validation. Ne jamais publier sans approbation.',
      topicsToAvoid: 'Trends TikTok de basse qualité non alignées avec le prestige de la marque.',
      postingFrequency: '3_per_week',
      visualPreferences: 'Rendu cinématographique 9:16, contrastes maîtrisés, transitions nettes.',
      autonomyLevel: 'supervised',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.data.agents = [agent1, agent2];

    // Agent instructions
    this.data.agentInstructions.push(
      {
        id: 'instr_001',
        agentId: agent1.id,
        userId: demoUser.id,
        category: 'general',
        title: 'Valorisation des artisans partenaires',
        content: 'Chaque semaine, mentionner le rôle d’un maître artisan verrier ou ébéniste avec son prénom.',
        isActive: true,
        createdAt: now,
      },
      {
        id: 'instr_002',
        agentId: agent1.id,
        userId: demoUser.id,
        category: 'campaign',
        title: 'Campagne Automne 2026 - L’Éloge du Chêne Brut',
        content: 'Mettre l’accent sur la durabilité et la chaleur du chêne massif local certifié PEFC.',
        isActive: true,
        createdAt: now,
      }
    );

    // 6. Social Accounts & Pages
    const demoMetaToken = encryptSecret('EAAB_mock_meta_access_token_valid_for_demo_sandbox_2026');

    const socialAccountFB: SocialAccount = {
      id: 'acc_fb_001',
      userId: demoUser.id,
      platform: 'facebook',
      externalUserId: '109876543210987',
      name: 'Atelier Créatif Paris (Meta Business Suite)',
      email: 'contact@ateliercreatif-paris.fr',
      encryptedAccessToken: demoMetaToken,
      tokenExpiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
      scopes: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'read_insights',
        'business_management',
      ],
      status: 'connected',
      lastCheckedAt: now,
      createdAt: now,
    };

    const socialAccountIG: SocialAccount = {
      id: 'acc_ig_001',
      userId: demoUser.id,
      platform: 'instagram',
      externalUserId: '17841400987654321',
      name: '@ateliercreatif_paris (Instagram Business)',
      encryptedAccessToken: demoMetaToken,
      tokenExpiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
      scopes: [
        'instagram_basic',
        'instagram_content_publish',
        'instagram_manage_insights',
        'pages_show_list',
      ],
      status: 'connected',
      lastCheckedAt: now,
      createdAt: now,
    };

    this.data.socialAccounts = [socialAccountFB, socialAccountIG];

    const fbPage: SocialPage = {
      id: 'page_fb_001',
      userId: demoUser.id,
      socialAccountId: socialAccountFB.id,
      platform: 'facebook',
      externalPageId: 'fb_page_1020304050',
      name: 'Atelier Créatif Paris',
      category: 'Artisanat & Décoration intérieure',
      profilePictureUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=120&auto=format&fit=crop&q=80',
      followersCount: 14850,
      timeZone: 'Europe/Paris',
      targetAudience: 'France entière, CSP+, amateurs de design durable',
      editorialGuidelines: 'Publications soignées, articles de fond, albums de chantiers finis.',
      preferredHours: ['08:30', '12:45', '18:30'],
      status: 'active',
      createdAt: now,
    };

    const igPage: SocialPage = {
      id: 'page_ig_001',
      userId: demoUser.id,
      socialAccountId: socialAccountIG.id,
      platform: 'instagram',
      externalPageId: 'ig_page_5040302010',
      name: 'ateliercreatif_paris',
      category: 'Design & Architecture',
      profilePictureUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=120&auto=format&fit=crop&q=80',
      followersCount: 28400,
      timeZone: 'Europe/Paris',
      targetAudience: 'Communauté design internationale et francophone',
      editorialGuidelines: 'Esthétique épurée, carrousels avant/après, coulisses vidéo.',
      preferredHours: ['12:00', '19:15', '21:00'],
      status: 'active',
      createdAt: now,
    };

    this.data.socialPages = [fbPage, igPage];

    // Assignments
    this.data.assignments = [
      {
        id: 'assign_001',
        agentId: agent1.id,
        pageId: fbPage.id,
        userId: demoUser.id,
        assignedAt: now,
      },
      {
        id: 'assign_002',
        agentId: agent2.id,
        pageId: igPage.id,
        userId: demoUser.id,
        assignedAt: now,
      },
    ];

    // 7. Seed Posts & Approval Workflow Demonstration
    const samplePosts: Post[] = [
      {
        id: 'post_001_pending',
        userId: demoUser.id,
        pageId: fbPage.id,
        agentId: agent1.id,
        platform: 'facebook',
        contentFormatted: `✨ **L'art de sculpter l'espace : la table Travertin & Chêne fumé** ✨

Dans le tumulte de la vie quotidienne, la table à manger demeure l’ancrage fondamental du foyer. Nous avons pensé cette pièce unique pour célébrer la rencontre entre la minéralité brute du travertin romain et la chaleur enveloppante du chêne fumé d'Île-de-France.

🌿 **Pourquoi ce dialogue de matières ?**
• Une résistance à l'épreuve des décennies
• Des veines naturelles qui racontent une histoire géologique
• Des finitions huilées végétales sans solvant

💬 *Et chez vous, quelle est la matière qui réchauffe instantanément votre salon ? Partagez vos impressions en commentaire !*`,
        contentRawText: `L'art de sculpter l'espace : la table Travertin & Chêne fumé.

Dans le tumulte de la vie quotidienne, la table à manger demeure l’ancrage fondamental du foyer. Nous avons pensé cette pièce unique pour célébrer la rencontre entre la minéralité brute du travertin romain et la chaleur enveloppante du chêne fumé d'Île-de-France.

Pourquoi ce dialogue de matières ?
- Une résistance à l'épreuve des décennies
- Des veines naturelles qui racontent une histoire géologique
- Des finitions huilées végétales sans solvant

Et chez vous, quelle est la matière qui réchauffe instantanément votre salon ? Partagez vos impressions en commentaire !`,
        visualPrompt: 'High-end architectural photography of a minimalist dining room in a Haussmannian apartment, bespoke travertine and smoked oak dining table in the center, warm morning sunlight, natural linen curtains, professional magazine editorial, 4k ultra realistic.',
        visualUrl: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1080&auto=format&fit=crop&q=80',
        visualVersions: [
          {
            id: 'vver_1',
            url: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1080&auto=format&fit=crop&q=80',
            prompt: 'High-end architectural photography of a minimalist dining room in a Haussmannian apartment, bespoke travertine and smoked oak dining table in the center, warm morning sunlight.',
            createdAt: now,
          },
        ],
        format: 'single_image',
        callToAction: 'Partagez vos impressions en commentaire',
        hashtags: ['#ArtisanatFrancais', '#DesignInterieur', '#TableSurMesure', '#AtelierCreatifParis'],
        scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        scheduledTime: '12:45',
        timeZone: 'Europe/Paris',
        status: 'pending_approval', // MANDATORY GATEKEEPER: Needs human validation
        approvalRequired: true,
        versionNumber: 1,
        idempotencyKey: 'idemp_post_001_demo',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'post_002_approved',
        userId: demoUser.id,
        pageId: igPage.id,
        agentId: agent2.id,
        platform: 'instagram',
        contentFormatted: `Coulisses d'Atelier 🪵 Le ponçage à la main : 4 heures de patience pour révéler le veinage doré du noyer massif.

Chaque courbe est vérifiée au toucher par nos artisans avant l'application de notre cire d'abeille bio.

Swipez pour admirer le reflet avant/après ! ➡️

#DesignDurable #EbénisterieModerne #SlowFurniture #ParisCraft #WoodworkingArt`,
        contentRawText: `Coulisses d'Atelier. Le ponçage à la main : 4 heures de patience pour révéler le veinage doré du noyer massif.

Chaque courbe est vérifiée au toucher par nos artisans avant l'application de notre cire d'abeille bio.

Swipez pour admirer le reflet avant/après !

#DesignDurable #EbénisterieModerne #SlowFurniture #ParisCraft #WoodworkingArt`,
        visualPrompt: 'Close up macro shot of an artisan cabinet maker hands sanding a curved solid walnut wooden surface with fine grain, fine wood dust particles in a sunbeam, warm lighting, Leica lens aesthetic.',
        visualUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1080&auto=format&fit=crop&q=80',
        visualVersions: [
          {
            id: 'vver_2',
            url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1080&auto=format&fit=crop&q=80',
            prompt: 'Close up macro shot of an artisan cabinet maker hands sanding a curved solid walnut wooden surface.',
            createdAt: now,
          },
        ],
        format: 'single_image',
        callToAction: 'Enregistrez cette publication pour vos inspirations déco',
        hashtags: ['#DesignDurable', '#EbénisterieModerne', '#SlowFurniture', '#ParisCraft', '#WoodworkingArt'],
        scheduledDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
        scheduledTime: '19:15',
        timeZone: 'Europe/Paris',
        status: 'approved', // Validated by human user!
        approvalRequired: true,
        approvedByUserId: demoUser.id,
        approvedAt: now,
        versionNumber: 1,
        idempotencyKey: 'idemp_post_002_demo',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'post_003_published',
        userId: demoUser.id,
        pageId: fbPage.id,
        agentId: agent1.id,
        platform: 'facebook',
        contentFormatted: `🌟 **Focus projet : Rénovation d'un loft contemporain dans le Marais**

Quand les poutres Eiffel du XIXe siècle rencontrent des cloisons japonaises en chêne clair et papier washi. Une harmonie parfaite entre lumière zénithale et intimité architecturale.

Découvrez les 6 étapes de cette transformation sur notre carnet de réalisations.`,
        contentRawText: `Focus projet : Rénovation d'un loft contemporain dans le Marais. Quand les poutres Eiffel du XIXe siècle rencontrent des cloisons japonaises en chêne clair et papier washi. Une harmonie parfaite entre lumière zénithale et intimité architecturale. Découvrez les 6 étapes de cette transformation sur notre carnet de réalisations.`,
        visualPrompt: 'Spacious loft interior in Paris Marais district, black industrial metal beams, bright wooden partitions, Japanese minimalism, designer sofa, plant decor, sunny daytime.',
        visualUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1080&auto=format&fit=crop&q=80',
        visualVersions: [
          {
            id: 'vver_3',
            url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1080&auto=format&fit=crop&q=80',
            prompt: 'Spacious loft interior in Paris Marais district.',
            createdAt: now,
          },
        ],
        format: 'single_image',
        callToAction: 'Lien en bio pour visiter le projet',
        hashtags: ['#ArchitectureParis', '#LoftDesign', '#RenovationMarais', '#AtelierCreatifParis'],
        scheduledDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        scheduledTime: '08:30',
        timeZone: 'Europe/Paris',
        status: 'published',
        approvalRequired: true,
        approvedByUserId: demoUser.id,
        approvedAt: new Date(Date.now() - 90000000).toISOString(),
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        metaExternalPostId: 'fb_1020304050_987654321',
        versionNumber: 1,
        idempotencyKey: 'idemp_post_003_demo',
        createdAt: now,
        updatedAt: now,
      },
    ];

    this.data.posts = samplePosts;

    // 8. Competitor & Trend Analysis Seeds
    const competitor: Competitor = {
      id: 'comp_001',
      userId: demoUser.id,
      name: 'Maison Moderne Studio',
      pageUrl: 'https://facebook.com/maisonmodernestudio',
      platform: 'facebook',
      industry: 'Mobilier contemporain & Architecture d’intérieur',
      notes: 'Concurrent direct positionné sur le mobilier scandinave minimaliste haut de gamme.',
      createdAt: now,
    };
    this.data.competitors = [competitor];

    this.data.competitorAnalyses.push({
      id: 'ana_001',
      userId: demoUser.id,
      competitorId: competitor.id,
      analysisDate: now,
      observedFrequency: '3 à 4 publications par semaine, forte activité en stories',
      contentThemes: [
        'Focus textures et matières naturelles',
        'Témoignages clients et architectes',
        'Séances photos professionnelles en appartements témoins',
      ],
      popularFormats: ['Carrousels 5 images (taux de save élevé)', 'Reels coulisses de livraison'],
      publicStrengths: [
        'Identité graphique très cohérente avec dominante beige et blanc chaud',
        'Forte présence dans les commentaires avec réponses sous 30 minutes',
      ],
      detectedGaps: [
        'Absence quasi totale de mise en avant des artisans et du processus de fabrication',
        'Peu d’explications techniques sur la provenance des matériaux et l’éco-responsabilité',
        'Pas de format vidéo éducatif sur l’entretien des meubles',
      ],
      recommendations: [
        'Différenciez l’Atelier Créatif Paris en valorisant le Made in France et les gestes de vos maîtres artisans.',
        'Exploitez le format carrousel éducatif "Comment entretenir sa table en travertin sans l’abîmer".',
        'Publiez le jeudi entre 18h30 et 19h30 pour capturer l’audience avant le pic de votre concurrent.',
      ],
      rawSummary: 'Analyse basée sur 30 jours de publications publiques : opportunité majeure sur l’authenticité et l’artisanat d’art.',
    });

    // Trend Report
    this.data.trendReports.push({
      id: 'trend_001',
      userId: demoUser.id,
      domain: 'Design d’intérieur & Mobilier contemporain',
      generatedAt: now,
      trendingTopics: [
        {
          topic: 'Le retour des formes organiques et des bois sombres (noyer, chêne brûlé shou sugi ban)',
          relevance: 96,
          angle: 'Élégance intemporelle contre l’obsolescence programmée du mobilier en kit.',
        },
        {
          topic: 'Minéralité sculpturale : tables d’appoint en travertin, marbre calacatta et lave émaillée',
          relevance: 89,
          angle: 'Inviter la sculpture dans l’espace domestique quotidien.',
        },
        {
          topic: 'Artisanat local et traçabilité carbone certifiée',
          relevance: 92,
          angle: 'Rencontre avec le menuisier : transparence totale sur l’origine des billes de bois.',
        },
      ],
      seasonalThemes: [
        'Lumières douces et matières réconfortantes pour l’automne/hiver',
        'Aménager un coin lecture chaleureux près d’une source de lumière naturelle',
      ],
      suggestedHooks: [
        'Et si votre table à manger était faite pour traverser 3 générations ?',
        'Le détail invisible que seuls les ébénistes d’art remarquent...',
        '3 erreurs qui détruisent le bois massif sans que vous le sachiez.',
      ],
    });

    // Performance Metrics
    this.data.metrics.push(
      {
        id: 'met_001',
        userId: demoUser.id,
        pageId: fbPage.id,
        postId: 'post_003_published',
        platform: 'facebook',
        reach: 12450,
        impressions: 18900,
        reactions: 684,
        comments: 72,
        shares: 41,
        clicks: 318,
        engagementRate: 6.4,
        collectedAt: now,
        isSimulatedOrEstimated: false,
      },
      {
        id: 'met_002',
        userId: demoUser.id,
        pageId: igPage.id,
        platform: 'instagram',
        reach: 22100,
        impressions: 34500,
        reactions: 1420,
        comments: 118,
        shares: 285,
        clicks: 540,
        engagementRate: 7.1,
        collectedAt: now,
        isSimulatedOrEstimated: false,
      }
    );

    // Initial Notifications
    this.data.notifications.push(
      {
        id: 'notif_001',
        userId: demoUser.id,
        type: 'post_ready_approval',
        title: 'Publication en attente de validation',
        message: 'L’agent Sophie a généré la publication Facebook "L’art de sculpter l’espace". Votre approbation explicite est requise.',
        link: '/posts',
        read: false,
        createdAt: now,
      },
      {
        id: 'notif_002',
        userId: demoUser.id,
        type: 'post_published',
        title: 'Publication réussie sur Facebook',
        message: 'Votre publication "Focus projet : Rénovation Marais" a été publiée avec succès sur votre page Facebook.',
        link: '/posts',
        read: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      }
    );

    // Initial Support Conversation
    const conv: Conversation = {
      id: 'conv_001',
      userId: demoUser.id,
      subject: 'Bienvenue sur Meta Colab et configuration des agents',
      status: 'open',
      lastMessageAt: now,
      createdAt: now,
    };
    this.data.conversations = [conv];

    this.data.messages.push(
      {
        id: 'msg_001',
        conversationId: conv.id,
        senderId: superAdmin.id,
        senderRole: 'admin',
        text: 'Bonjour Camille, bienvenue sur Meta Colab ! Votre Pack Pro est actif. Nos agents Sophie et Lucas sont prêts à vous accompagner. N’hésitez pas si vous avez des questions sur l’association de vos pages Meta ou la configuration des compétences.',
        read: true,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'msg_002',
        conversationId: conv.id,
        senderId: demoUser.id,
        senderRole: 'user',
        text: 'Merci beaucoup Alexandre ! J’ai configuré les instructions de Sophie pour notre nouvelle collection de chêne brut, les premières propositions sont impressionnantes.',
        read: false,
        createdAt: now,
      }
    );

    // Initial System Settings
    this.data.settings = [
      {
        id: 'set_001',
        key: 'platform_name',
        value: 'Meta Colab',
        description: 'Nom public de la plateforme',
        updatedAt: now,
      },
      {
        id: 'set_002',
        key: 'default_language',
        value: 'fr',
        description: 'Langue système par défaut',
        updatedAt: now,
      },
      {
        id: 'set_003',
        key: 'mandatory_human_approval',
        value: 'true',
        description: 'Règle stricte : aucune publication sans validation humaine explicite',
        updatedAt: now,
      },
      {
        id: 'set_004',
        key: 'meta_api_version',
        value: 'v21.0',
        description: 'Version Graph API Meta utilisée',
        updatedAt: now,
      },
    ];

    // Audit Log
    this.data.auditLogs.push({
      id: 'audit_001',
      userId: superAdmin.id,
      userEmail: superAdmin.email,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'System',
      entityId: 'metacolab_core',
      details: 'Initialisation de la base de données, création des comptes sécurisés et des 4 packs d’abonnement.',
      ipAddress: '127.0.0.1',
      timestamp: now,
    });
  }

  // Generic and specific getters & setters
  get users() { return this.data.users; }
  set users(val: User[]) { this.data.users = val; }
  get sessions() { return this.data.sessions; }
  set sessions(val: Session[]) { this.data.sessions = val; }
  get plans() { return this.data.plans; }
  set plans(val: SubscriptionPlan[]) { this.data.plans = val; }
  get subscriptions() { return this.data.subscriptions; }
  set subscriptions(val: Subscription[]) { this.data.subscriptions = val; }
  get usages() { return this.data.usages; }
  set usages(val: SubscriptionUsage[]) { this.data.usages = val; }
  get payments() { return this.data.payments; }
  set payments(val: Payment[]) { this.data.payments = val; }
  get aiProviders() { return this.data.aiProviders; }
  set aiProviders(val: AIProviderConfig[]) { this.data.aiProviders = val; }
  get aiUsageLogs() { return this.data.aiUsageLogs; }
  set aiUsageLogs(val: AIUsageLog[]) { this.data.aiUsageLogs = val; }
  get agents() { return this.data.agents; }
  set agents(val: Agent[]) { this.data.agents = val; }
  get agentInstructions() { return this.data.agentInstructions; }
  set agentInstructions(val: AgentInstruction[]) { this.data.agentInstructions = val; }
  get agentVersions() { return this.data.agentVersions; }
  set agentVersions(val: AgentConfigurationVersion[]) { this.data.agentVersions = val; }
  get socialAccounts() { return this.data.socialAccounts; }
  set socialAccounts(val: SocialAccount[]) { this.data.socialAccounts = val; }
  get socialPages() { return this.data.socialPages; }
  set socialPages(val: SocialPage[]) { this.data.socialPages = val; }
  get assignments() { return this.data.assignments; }
  set assignments(val: AgentPageAssignment[]) { this.data.assignments = val; }
  get brandProfiles() { return this.data.brandProfiles; }
  set brandProfiles(val: BrandProfile[]) { this.data.brandProfiles = val; }
  get inspirationAssets() { return this.data.inspirationAssets; }
  set inspirationAssets(val: InspirationAsset[]) { this.data.inspirationAssets = val; }
  get campaigns() { return this.data.campaigns; }
  set campaigns(val: Campaign[]) { this.data.campaigns = val; }
  get calendars() { return this.data.calendars; }
  set calendars(val: EditorialCalendar[]) { this.data.calendars = val; }
  get calendarItems() { return this.data.calendarItems; }
  set calendarItems(val: EditorialCalendarItem[]) { this.data.calendarItems = val; }
  get posts() { return this.data.posts; }
  set posts(val: Post[]) { this.data.posts = val; }
  get postVersions() { return this.data.postVersions; }
  set postVersions(val: PostVersion[]) { this.data.postVersions = val; }
  get scheduledJobs() { return this.data.scheduledJobs; }
  set scheduledJobs(val: ScheduledJob[]) { this.data.scheduledJobs = val; }
  get attempts() { return this.data.attempts; }
  set attempts(val: PublicationAttempt[]) { this.data.attempts = val; }
  get competitors() { return this.data.competitors; }
  set competitors(val: Competitor[]) { this.data.competitors = val; }
  get competitorAnalyses() { return this.data.competitorAnalyses; }
  set competitorAnalyses(val: CompetitorAnalysis[]) { this.data.competitorAnalyses = val; }
  get trendReports() { return this.data.trendReports; }
  set trendReports(val: TrendReport[]) { this.data.trendReports = val; }
  get metrics() { return this.data.metrics; }
  set metrics(val: PerformanceMetric[]) { this.data.metrics = val; }
  get recommendations() { return this.data.recommendations; }
  set recommendations(val: Recommendation[]) { this.data.recommendations = val; }
  get notifications() { return this.data.notifications; }
  set notifications(val: Notification[]) { this.data.notifications = val; }
  get emailLogs() { return this.data.emailLogs; }
  set emailLogs(val: EmailLog[]) { this.data.emailLogs = val; }
  get conversations() { return this.data.conversations; }
  set conversations(val: Conversation[]) { this.data.conversations = val; }
  get messages() { return this.data.messages; }
  set messages(val: Message[]) { this.data.messages = val; }
  get settings() { return this.data.settings; }
  set settings(val: SystemSetting[]) { this.data.settings = val; }
  get auditLogs() { return this.data.auditLogs; }
  set auditLogs(val: AuditLog[]) { this.data.auditLogs = val; }
}

export const db = new DatabaseStore();
