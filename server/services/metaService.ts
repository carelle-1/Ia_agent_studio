import { db } from '../db.js';
import { decryptSecret } from '../security.js';
import { SocialAccount, SocialPage, Post } from '../types.js';

export interface MetaConnectionTestResult {
  success: boolean;
  code: 'valid' | 'insufficient_permissions' | 'token_expired' | 'page_inaccessible' | 'sandbox_mode' | 'api_error';
  message: string;
  permissionsFound: string[];
  missingPermissions: string[];
  expiresInDays?: number;
}

export interface MetaPublishResult {
  success: boolean;
  metaPostId?: string;
  errorMessage?: string;
  errorCode?: string;
}

export class MetaService {
  private apiVersion = 'v21.0';
  private graphUrl = 'https://graph.facebook.com';

  /**
   * Generates the official Meta OAuth Authorization URL
   * @param platform - 'facebook' | 'instagram' | 'all' (default: 'facebook')
   * Instagram-only scopes are excluded from Facebook login to avoid the
   * "Invalid Scopes" error for non-developer users of the app.
   */
  getOAuthUrl(redirectUri: string, state: string, platform: 'facebook' | 'instagram' | 'all' = 'facebook'): string {
    const appId = process.env.META_APP_ID || '123456789012345';

    const facebookScopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'read_insights',
      'business_management',
    ];

    const instagramScopes = [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
    ];

    let scopes: string[];
    if (platform === 'instagram') {
      scopes = instagramScopes;
    } else if (platform === 'all') {
      scopes = [...facebookScopes, ...instagramScopes];
    } else {
      scopes = facebookScopes;
    }

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}&scope=${encodeURIComponent(scopes.join(','))}&response_type=code`;
  }

  /**
   * Tests a social account connection against Meta servers or sandbox validation
   */
  async testConnection(account: SocialAccount, page?: SocialPage): Promise<MetaConnectionTestResult> {
    const token = decryptSecret(page?.encryptedAccessToken || account.encryptedAccessToken);

    if (!token) {
      return {
        success: false,
        code: 'token_expired',
        message: 'Aucun jeton d’accès valide trouvé. Veuillez réautoriser votre compte Meta.',
        permissionsFound: [],
        missingPermissions: ['pages_manage_posts', 'instagram_content_publish'],
      };
    }

    // Check if demo or sandbox token
    if (token.includes('mock_meta_access_token') || token.startsWith('EAAB_mock')) {
      return {
        success: true,
        code: 'sandbox_mode',
        message: 'Connexion Sandbox / Démonstration vérifiée avec succès. Toutes les autorisations requises sont simulées comme actives.',
        permissionsFound: account.scopes,
        missingPermissions: [],
        expiresInDays: 58,
      };
    }

    // Real Meta Graph API check
    try {
      const inspectUrl = `${this.graphUrl}/${this.apiVersion}/me/permissions?access_token=${token}`;
      const response = await fetch(inspectUrl);
      const data = await response.json();

      if (data.error) {
        if (data.error.code === 190) {
          account.status = 'expired';
          account.lastError = 'Jeton d’accès Meta expiré (Error 190).';
          db.persist();
          return {
            success: false,
            code: 'token_expired',
            message: 'Le jeton d’accès Meta a expiré ou a été révoqué par l’utilisateur. Veuillez vous reconnecter.',
            permissionsFound: [],
            missingPermissions: ['pages_manage_posts', 'instagram_content_publish'],
          };
        }

        return {
          success: false,
          code: 'api_error',
          message: data.error.message || 'Erreur lors de la vérification auprès des serveurs Meta.',
          permissionsFound: [],
          missingPermissions: [],
        };
      }

      const activePermissions: string[] = (data.data || [])
        .filter((p: any) => p.status === 'granted')
        .map((p: any) => p.permission);

      const requiredForFacebook = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];
      const requiredForInstagram = ['instagram_basic', 'instagram_content_publish'];
      const required = account.platform === 'facebook' ? requiredForFacebook : requiredForInstagram;

      const missing = required.filter((r) => !activePermissions.includes(r));

      if (missing.length > 0) {
        account.status = 'invalid_permissions';
        account.lastError = `Permissions manquantes : ${missing.join(', ')}`;
        db.persist();
        return {
          success: false,
          code: 'insufficient_permissions',
          message: `Permissions manquantes pour publier : ${missing.join(', ')}. Veuillez réautoriser les permissions lors de la connexion.`,
          permissionsFound: activePermissions,
          missingPermissions: missing,
        };
      }

      account.status = 'connected';
      account.lastCheckedAt = new Date().toISOString();
      account.lastError = undefined;
      db.persist();

      return {
        success: true,
        code: 'valid',
        message: 'Connexion Meta vérifiée et opérationnelle. Les autorisations de publication sont valides.',
        permissionsFound: activePermissions,
        missingPermissions: [],
        expiresInDays: 60,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'api_error',
        message: `Impossible de contacter l'API Meta : ${err.message || 'Erreur réseau'}`,
        permissionsFound: [],
        missingPermissions: [],
      };
    }
  }

  /**
   * Publishes an approved post to Facebook or Instagram via Graph API
   * MANDATORY: Re-verifies user approval before attempting any transmission!
   */
  async publishPost(post: Post, page: SocialPage, account: SocialAccount): Promise<MetaPublishResult> {
    // CRITICAL SECURITY & COMPLIANCE RULE #9:
    if (post.status !== 'approved' && post.status !== 'scheduled' && post.status !== 'publishing') {
      return {
        success: false,
        errorCode: 'UNAPPROVED_POST',
        errorMessage: 'Interdiction absolue : Cette publication n’a pas été explicitement validée par l’utilisateur.',
      };
    }

    const token = decryptSecret(page.encryptedAccessToken || account.encryptedAccessToken);
    if (!token) {
      return {
        success: false,
        errorCode: 'MISSING_ACCESS_TOKEN',
        errorMessage: 'Aucun jeton d’accès disponible pour ce compte social.',
      };
    }

    // Clean post content for Graph API
    const caption = post.contentRawText || post.contentFormatted.replace(/\*\*/g, '').replace(/###/g, '');

    // Sandbox / Test Mode
    if (token.includes('mock_meta_access_token') || token.startsWith('EAAB_mock') || process.env.NODE_ENV !== 'production') {
      // Realistic simulation with confirmation ID
      const fakeMetaId = page.platform === 'facebook'
        ? `fb_${page.externalPageId}_${Date.now()}`
        : `ig_media_${page.externalPageId}_${Date.now()}`;

      // Artificial small network latency for realism
      await new Promise((resolve) => setTimeout(resolve, 350));

      return {
        success: true,
        metaPostId: fakeMetaId,
      };
    }

    // Real Meta Graph API Call
    try {
      if (page.platform === 'facebook') {
        const url = `${this.graphUrl}/${this.apiVersion}/${page.externalPageId}/feed`;
        const body = new URLSearchParams({
          message: caption,
          access_token: token,
        });

        if (post.visualUrl && !post.visualUrl.includes('localhost')) {
          body.append('link', post.visualUrl);
        }

        const res = await fetch(url, {
          method: 'POST',
          body,
        });
        const json = await res.json();

        if (json.error) {
          return {
            success: false,
            errorCode: String(json.error.code),
            errorMessage: json.error.message || 'Erreur retournée par l’API Facebook.',
          };
        }

        return {
          success: true,
          metaPostId: json.id,
        };
      } else {
        // Instagram 2-step publishing workflow:
        // 1. Create Media Container: POST /{ig-user-id}/media?image_url=...&caption=...
        // 2. Publish Container: POST /{ig-user-id}/media_publish?creation_id=...
        const containerUrl = `${this.graphUrl}/${this.apiVersion}/${page.externalPageId}/media`;
        const containerBody = new URLSearchParams({
          image_url: post.visualUrl,
          caption,
          access_token: token,
        });

        const containerRes = await fetch(containerUrl, {
          method: 'POST',
          body: containerBody,
        });
        const containerJson = await containerRes.json();

        if (containerJson.error || !containerJson.id) {
          return {
            success: false,
            errorCode: String(containerJson.error?.code || 'IG_CONTAINER_ERR'),
            errorMessage: containerJson.error?.message || 'Échec de création du conteneur média Instagram.',
          };
        }

        const publishUrl = `${this.graphUrl}/${this.apiVersion}/${page.externalPageId}/media_publish`;
        const publishBody = new URLSearchParams({
          creation_id: containerJson.id,
          access_token: token,
        });

        const publishRes = await fetch(publishUrl, {
          method: 'POST',
          body: publishBody,
        });
        const publishJson = await publishRes.json();

        if (publishJson.error) {
          return {
            success: false,
            errorCode: String(publishJson.error.code),
            errorMessage: publishJson.error.message || 'Échec de publication finale sur Instagram.',
          };
        }

        return {
          success: true,
          metaPostId: publishJson.id,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_FAILURE',
        errorMessage: err.message || 'Erreur de connexion aux serveurs Meta.',
      };
    }
  }
}

export const metaService = new MetaService();
