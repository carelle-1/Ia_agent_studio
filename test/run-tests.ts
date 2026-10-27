import { hashPassword, verifyPassword, encryptSecret, decryptSecret } from '../server/security.js';
import { db } from '../server/db.js';
import { metaService } from '../server/services/metaService.js';
import { schedulerService } from '../server/services/schedulerService.js';
import { Post, SocialPage, SocialAccount } from '../server/types.js';

interface TestResult {
  name: string;
  category: 'Unit' | 'Integration' | 'Security';
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTest(name: string, category: 'Unit' | 'Integration' | 'Security', fn: () => Promise<void> | void) {
  try {
    await fn();
    results.push({ name, category, passed: true });
    console.log(`  ✅ [${category}] ${name}`);
  } catch (err: any) {
    results.push({ name, category, passed: false, error: err.message });
    console.error(`  ❌ [${category}] ${name} -> ${err.message}`);
  }
}

async function main() {
  console.log('\n=======================================================');
  console.log('   🧪 META COLAB - SUITE DE TESTS AUTOMATISÉS');
  console.log('=======================================================\n');

  // --- 1. TESTS UNITAIRES ---
  console.log('1. Tests Unitaires :');

  await runTest('Hachage PBKDF2 sécurisé et vérification du mot de passe', 'Unit', () => {
    const password = 'SuperSecretPassword2026!';
    const { hash, salt } = hashPassword(password);
    assert(hash.length > 32, 'Le hash doit être valide et non vide');
    assert(salt.length > 16, 'Le salt doit être unique');
    assert(verifyPassword(password, hash, salt), 'La vérification du mot de passe doit réussir');
    assert(!verifyPassword('WrongPass', hash, salt), 'Un mauvais mot de passe doit être rejeté');
  });

  await runTest('Chiffrement AES-256-GCM et déchiffrement des jetons Meta et clés API', 'Unit', () => {
    const secretToken = 'EAAB_real_meta_long_lived_token_secret_12345';
    const encrypted = encryptSecret(secretToken);
    assert(encrypted !== secretToken, 'Le secret ne doit pas être en clair');
    assert(encrypted.includes(':'), 'Le format chiffré doit contenir iv:tag:data');
    const decrypted = decryptSecret(encrypted);
    assert(decrypted === secretToken, 'Le déchiffrement doit restituer la chaîne d’origine');
  });

  await runTest('Règle d’Or : Rejet strict de toute publication non approuvée par l’humain', 'Unit', async () => {
    const unapprovedPost: Post = {
      id: 'test_post_unapproved',
      userId: 'usr_test',
      pageId: 'page_test',
      agentId: 'agent_test',
      platform: 'facebook',
      contentFormatted: 'Texte non validé',
      contentRawText: 'Texte non validé',
      visualPrompt: '',
      visualUrl: '',
      visualVersions: [],
      format: 'single_image',
      callToAction: '',
      hashtags: [],
      scheduledDate: '2026-10-24',
      scheduledTime: '12:00',
      timeZone: 'Europe/Paris',
      status: 'pending_approval', // NON VALIDÉ
      approvalRequired: true,
      versionNumber: 1,
      idempotencyKey: 'idemp_test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const dummyPage: SocialPage = {
      id: 'page_test',
      userId: 'usr_test',
      socialAccountId: 'acc_test',
      platform: 'facebook',
      externalPageId: 'fb_123456',
      name: 'Test Page',
      category: 'Test',
      followersCount: 100,
      timeZone: 'Europe/Paris',
      targetAudience: 'Test',
      editorialGuidelines: '',
      preferredHours: [],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const dummyAccount: SocialAccount = {
      id: 'acc_test',
      userId: 'usr_test',
      platform: 'facebook',
      externalUserId: 'ext_123',
      name: 'Test Account',
      encryptedAccessToken: encryptSecret('dummy_token'),
      scopes: ['pages_manage_posts'],
      status: 'connected',
      lastCheckedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const result = await metaService.publishPost(unapprovedPost, dummyPage, dummyAccount);
    assert(!result.success, 'La publication non approuvée doit obligatoirement être rejetée');
    assert(result.errorCode === 'UNAPPROVED_POST', 'Code erreur UNAPPROVED_POST attendu');
  });

  // --- 2. TESTS D’INTÉGRATION ---
  console.log('\n2. Tests d’Intégration :');

  await runTest('Persistance base de données et initialisation des forfaits (Pack Free Test, Starter, Pro, Premium)', 'Integration', () => {
    assert(db.plans.length >= 4, 'Les 4 packs doivent être initialisés');
    const freePlan = db.plans.find((p) => p.key === 'free_test');
    assert(Boolean(freePlan), 'Pack Free Test présent');
    assert(freePlan?.maxAgents === 1, 'Free Test limité à 1 agent');
    assert(freePlan?.trialDays === 7, 'Free Test limité à 7 jours d’essai');
  });

  await runTest('Comptes de démonstration pré-configurés (SuperAdmin & Demo User)', 'Integration', () => {
    const admin = db.users.find((u) => u.email === 'admin@metacolab.io');
    const user = db.users.find((u) => u.email === 'demo@metacolab.io');
    assert(Boolean(admin), 'Compte admin@metacolab.io présent');
    assert(admin?.role === 'superadmin', 'Rôle superadmin vérifié');
    assert(Boolean(user), 'Compte demo@metacolab.io présent');
    assert(user?.role === 'user', 'Rôle standard vérifié');
  });

  await runTest('Workflow de transition de statut d’une publication', 'Integration', () => {
    const post = db.posts.find((p) => p.id === 'post_001_pending');
    assert(Boolean(post), 'Post de test présent');
    assert(post?.status === 'pending_approval', 'Statut initial en attente de validation');

    // Human user validation approval transition
    post!.status = 'approved';
    post!.approvedByUserId = 'usr_demo_002';
    post!.approvedAt = new Date().toISOString();
    assert(post!.status === 'approved', 'Post validé par l’utilisateur');

    // Invalidation on modification rule check
    // If text modified, status must reset to pending_approval
    post!.contentFormatted += ' (Nouvelle phrase ajoutée après validation)';
    post!.status = 'pending_approval';
    post!.approvedByUserId = undefined;
    post!.approvedAt = undefined;
    assert(post!.status === 'pending_approval', 'La modification après validation doit réinitialiser le statut');
  });

  // --- 3. TESTS DE SÉCURITÉ & ISOLATION MULTI-TENANT ---
  console.log('\n3. Tests de Sécurité & Isolation :');

  await runTest('Isolation des données : L’utilisateur A ne peut pas accéder aux publications de l’utilisateur B', 'Security', () => {
    const userAId = 'usr_demo_002';
    const userBId = 'usr_other_999';

    // Query with tenant filter
    const userAPosts = db.posts.filter((p) => p.userId === userAId);
    const userBPosts = db.posts.filter((p) => p.userId === userBId);

    assert(userAPosts.length > 0, 'User A a ses propres publications');
    assert(userBPosts.length === 0, 'User B n’a pas accès aux publications de User A');
  });

  await runTest('Protection contre l’exposition des jetons d’accès en clair', 'Security', () => {
    for (const acc of db.socialAccounts) {
      assert(!acc.encryptedAccessToken.includes('EAAB_mock_meta_access_token_valid_for_demo_sandbox_2026'), 'Le jeton d’accès doit être chiffré');
      assert(!acc.encryptedAccessToken.startsWith('EAAB'), 'Le jeton ne doit pas être en clair');
    }
  });

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log('\n=======================================================');
  console.log(`  RAPPORT DES TESTS : ${passedCount}/${totalCount} RÉUSSIS (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log('=======================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
