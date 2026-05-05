// One-shot migration: prepend a standard SDE disclaimer to every building's
// `icpeRegulations` field. Buildings whose portfolio name contains "logicor"
// (case-insensitive) get the LOGICOR-specific addendum.
//
// Idempotent: if the disclaimer is already present (detected via a stable
// marker substring), the building is skipped.
//
// Usage:
//   Dry-run (default — no writes):
//     node --env-file=.env scripts/migrate-icpe-regulations.mjs
//   Apply for real:
//     node --env-file=.env scripts/migrate-icpe-regulations.mjs --apply
//
// Requirements: Node 20+, the same VITE_FIREBASE_* env vars used by the app.
// If your Firestore rules require authentication, uncomment the auth block
// below and provide MIGRATION_EMAIL / MIGRATION_PASSWORD in your env.

import { initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
} from 'firebase/firestore';
// import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const BASE_MENTION =
  "Dans le cadre du contrat liant le bureau d’études SDE au commanditaire, le présent audit porte exclusivement sur les conditions d’exploitation du bâtiment et fournit, à titre indicatif, des éléments relatifs aux dispositions constructives. Il est rappelé que la société SD Environnement n’est pas un bureau de contrôle, mais un cabinet d’études spécialisé en ICPE.";

const LOGICOR_SUFFIX =
  "\nPour rappel, les audits ont été réalisés sur la base des documents transmis en amont de la visite, notamment les rapports de contrôle 2025, utilisés comme référence pour l’analyse conformément aux directives de LOGICOR. La visite de chaque site a été organisée selon le planning communiqué en février.";

// Stable marker for idempotency. If this substring is already present in the
// building's icpeRegulations, we assume the migration has already run.
const IDEMPOTENCY_MARKER =
  "Dans le cadre du contrat liant le bureau d’études SDE au commanditaire";

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');
const SAMPLE_LIMIT = 3;
const BATCH_SIZE = 400; // Firestore writeBatch limit is 500.

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error('Missing VITE_FIREBASE_PROJECT_ID. Did you pass --env-file=.env?');
  process.exit(1);
}

console.log(`Firebase project : ${firebaseConfig.projectId}`);
console.log(`Mode             : ${APPLY ? 'APPLY (writes)' : 'DRY-RUN (no writes)'}`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// If your Firestore rules require auth, uncomment:
// const auth = getAuth(app);
// await signInWithEmailAndPassword(auth, process.env.MIGRATION_EMAIL, process.env.MIGRATION_PASSWORD);

console.log('\nLoading portfolios...');
const portfoliosSnap = await getDocs(collection(db, 'portfolios'));
const portfoliosById = new Map();
portfoliosSnap.forEach((d) => {
  portfoliosById.set(d.id, (d.data().name || '').toString());
});
console.log(`  ${portfoliosById.size} portfolios loaded`);

console.log('\nLoading buildings...');
const buildingsSnap = await getDocs(collection(db, 'buildings'));
console.log(`  ${buildingsSnap.size} buildings loaded`);

const updates = [];
let alreadyMigrated = 0;
let logicorCount = 0;
let missingPortfolio = 0;

buildingsSnap.forEach((d) => {
  const data = d.data();
  const current = (data.icpeRegulations ?? '').toString();
  const portfolioId = data.portfolio || '';
  const portfolioName = portfoliosById.get(portfolioId) || '';
  if (portfolioId && !portfoliosById.has(portfolioId)) missingPortfolio++;

  if (current.includes(IDEMPOTENCY_MARKER)) {
    alreadyMigrated++;
    return;
  }

  const isLogicor = portfolioName.toLowerCase().includes('logicor');
  if (isLogicor) logicorCount++;

  const mention = isLogicor ? BASE_MENTION + LOGICOR_SUFFIX : BASE_MENTION;
  // Prepend the disclaimer; preserve the existing description after a blank line.
  const newValue = current.trim().length > 0 ? `${mention}\n\n${current}` : mention;

  updates.push({
    id: d.id,
    name: data.name || '(no name)',
    portfolioId,
    portfolioName,
    isLogicor,
    currentValue: current,
    currentLength: current.length,
    newValue,
  });
});

console.log('\nSummary:');
console.log(`  ${updates.length} buildings to update`);
console.log(`     ↳ ${logicorCount} Logicor / ${updates.length - logicorCount} other`);
console.log(`  ${alreadyMigrated} already migrated (skipped)`);
if (missingPortfolio > 0) {
  console.log(`  ⚠ ${missingPortfolio} buildings reference an unknown portfolio (treated as non-Logicor)`);
}

// Pick a meaningful sample: prefer one Logicor + one non-Logicor + one with
// the longest existing icpeRegulations (so we can visually confirm the prepend
// preserves the original text in full).
function pickSample(list, limit) {
  const picked = new Map();
  const logicor = list.find((u) => u.isLogicor);
  const nonLogicor = list.find((u) => !u.isLogicor);
  const longest = [...list].sort((a, b) => b.currentLength - a.currentLength)[0];
  for (const u of [logicor, nonLogicor, longest]) {
    if (u && !picked.has(u.id)) picked.set(u.id, u);
  }
  for (const u of list) {
    if (picked.size >= limit) break;
    if (!picked.has(u.id)) picked.set(u.id, u);
  }
  return Array.from(picked.values()).slice(0, limit);
}

const indent = (s) => s.replace(/\n/g, '\n    ');

console.log(`\nSample (${Math.min(SAMPLE_LIMIT, updates.length)} buildings — full BEFORE/AFTER):`);
pickSample(updates, SAMPLE_LIMIT).forEach((u, i) => {
  console.log(`\n──────────────────────────────────────────────────────────────────────────────`);
  console.log(`[${i + 1}] ${u.name}`);
  console.log(`    id=${u.id}  portfolio="${u.portfolioName}"  logicor=${u.isLogicor}`);
  console.log(`    existing length=${u.currentLength} chars  →  new length=${u.newValue.length} chars`);
  console.log(`\n    ── BEFORE (current icpeRegulations) ──`);
  console.log(`    ${u.currentLength === 0 ? '(empty)' : indent(u.currentValue)}`);
  console.log(`\n    ── AFTER (new icpeRegulations) ──`);
  console.log(`    ${indent(u.newValue)}`);
});
console.log(`\n──────────────────────────────────────────────────────────────────────────────`);

if (VERBOSE) {
  console.log('\nFull list of buildings to update:');
  updates.forEach((u) => {
    console.log(`  - ${u.id} | ${u.name} | portfolio="${u.portfolioName}" | logicor=${u.isLogicor}`);
  });
}

if (!APPLY) {
  console.log('\n[DRY-RUN] No writes performed. Re-run with --apply to commit.');
  process.exit(0);
}

if (updates.length === 0) {
  console.log('\nNothing to update. Exiting.');
  process.exit(0);
}

console.log(`\nApplying ${updates.length} updates in batches of ${BATCH_SIZE}...`);
let written = 0;
let failed = 0;
for (let i = 0; i < updates.length; i += BATCH_SIZE) {
  const chunk = updates.slice(i, i + BATCH_SIZE);
  const batch = writeBatch(db);
  chunk.forEach((u) => {
    batch.update(doc(db, 'buildings', u.id), { icpeRegulations: u.newValue });
  });
  try {
    await batch.commit();
    written += chunk.length;
    console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}: committed ${chunk.length} (total ${written}/${updates.length})`);
  } catch (err) {
    failed += chunk.length;
    console.error(`  batch ${Math.floor(i / BATCH_SIZE) + 1}: FAILED — ${err?.message || err}`);
  }
}

console.log(`\nDone. Written: ${written}, failed: ${failed}.`);
process.exit(failed > 0 ? 1 : 0);
