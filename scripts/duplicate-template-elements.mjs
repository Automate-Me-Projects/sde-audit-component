// One-shot migration: change DEFAULT templateElement labels for NEW audits while
// preserving the OLD labels for EXISTING audits.
//
// Strategy (validated against the data model):
//   Audits reference templateElements by id and read `name` LIVE — so renaming a
//   doc in place would change every existing audit too. Instead, for each target:
//     1. DUPLICATE the doc with the NEW `name` and `isDefault: true`.
//        (copy categoryId, subCategoryId, templateVersion, positionByVersion as-is
//         so the new element renders/sorts exactly where the old one did)
//     2. Flip the OLD doc to `isDefault: false` (name + templateVersion untouched).
//   → Existing audits keep referencing the old doc → OLD label preserved.
//   → New audits are seeded from `isDefault === true` (Retool) → get the NEW label.
//
// The new doc carries `duplicatedFrom: <oldId>` for provenance AND idempotency:
// re-running detects an existing duplicate and skips it.
//
// Usage:
//   Dry-run (default — no writes):
//     node --env-file=.env scripts/duplicate-template-elements.mjs
//   Apply for real:
//     node --env-file=.env scripts/duplicate-template-elements.mjs --apply
//
// Requirements: Node 20+, the same VITE_FIREBASE_* env vars used by the app.
// If your Firestore rules require authentication, uncomment the auth block below
// and provide MIGRATION_EMAIL / MIGRATION_PASSWORD in your env.

import { initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
// import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// ─────────────────────────────────────────────────────────────────────────────
// THE LIST — fill this in: one entry per templateElement to relabel.
//   oldId   = the templateElement document id (the `_id` you see in the app)
//   newName = the new label for NEW audits
// ─────────────────────────────────────────────────────────────────────────────
const RENAMES = [
  // ancien : Description du système de sécurité incendie
  { oldId: 'Np9Y5N6dKaees2nA1lAX', newName: "Fonctionnement du report d'alarme" },
  // ancien : Asservissement de la charge à la ventilation
  { oldId: 'Yk8YzG1KztrvRbThbctG', newName: "Présence d'une ventilation" },
  // ancien : Disconnecteur alimentation en eau
  { oldId: 'ZZW0SHeNgckM30FkyqnP', newName: "Présence d'une détection incendie" },
  // ancien : Vérification/Entretien
  { oldId: '2ENrvLJ6oJOMkFWexrSt', newName: 'Vérification/Entretien (AEP/Eaux incendie/Chaufferie)' },
  // ancien : Contrôle de l'extracteur d'air
  { oldId: 'pkJaqDTaOdgYB8aqjGps', newName: "Contrôle du fonctionnement et de l'asservissement de l'extracteur d'air" },
];

const COLLECTION = 'templateElements';
const APPLY = process.argv.includes('--apply');
const BATCH_SIZE = 400; // Firestore writeBatch limit is 500; each rename = 2 writes.

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

if (RENAMES.length === 0) {
  console.error('RENAMES is empty. Add { oldId, newName } entries before running.');
  process.exit(1);
}

console.log(`Firebase project : ${firebaseConfig.projectId}`);
console.log(`Collection       : ${COLLECTION}`);
console.log(`Targets          : ${RENAMES.length}`);
console.log(`Mode             : ${APPLY ? 'APPLY (writes)' : 'DRY-RUN (no writes)'}`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// If your Firestore rules require auth, uncomment:
// const auth = getAuth(app);
// await signInWithEmailAndPassword(auth, process.env.MIGRATION_EMAIL, process.env.MIGRATION_PASSWORD);

const now = Timestamp.now();
const plan = [];     // { oldId, oldName, newName, oldData }
const skipped = [];  // { oldId, reason }
const errors = [];   // { oldId, reason }

console.log('\nResolving targets...');
for (const { oldId, newName } of RENAMES) {
  if (!oldId || !newName) {
    errors.push({ oldId: oldId || '(missing)', reason: 'oldId and newName are both required' });
    continue;
  }

  const oldSnap = await getDoc(doc(db, COLLECTION, oldId));
  if (!oldSnap.exists()) {
    errors.push({ oldId, reason: 'templateElement not found' });
    continue;
  }
  const oldData = oldSnap.data();

  // Idempotency: already duplicated?
  const existing = await getDocs(
    query(collection(db, COLLECTION), where('duplicatedFrom', '==', oldId))
  );
  const alreadyDone = existing.docs.find(
    (d) => d.data().name === newName && d.data().isDefault === true
  );
  if (alreadyDone) {
    skipped.push({ oldId, reason: `already duplicated → ${alreadyDone.id}` });
    continue;
  }

  plan.push({ oldId, oldName: oldData.name, newName, oldData });
}

console.log('\nSummary:');
console.log(`  ${plan.length} to duplicate`);
console.log(`  ${skipped.length} already done (skipped)`);
console.log(`  ${errors.length} errors`);

if (skipped.length) {
  console.log('\nSkipped:');
  skipped.forEach((s) => console.log(`  - ${s.oldId} : ${s.reason}`));
}
if (errors.length) {
  console.log('\n⚠ Errors (these targets will NOT be processed):');
  errors.forEach((e) => console.log(`  - ${e.oldId} : ${e.reason}`));
}

if (plan.length) {
  console.log('\nPlanned changes (BEFORE → AFTER):');
  plan.forEach((p, i) => {
    console.log(`\n  [${i + 1}] old doc ${p.oldId}`);
    console.log(`      OLD doc : name="${p.oldName}"  isDefault: (current) → false`);
    console.log(`      NEW doc : name="${p.newName}"  isDefault: true`);
    console.log(`                categoryId=${p.oldData.categoryId}  subCategoryId=${p.oldData.subCategoryId ?? 'null'}`);
    console.log(`                templateVersion=[${(p.oldData.templateVersion ?? []).join(', ')}]  positionByVersion=[${(p.oldData.positionByVersion ?? []).join(', ')}]`);
  });
}

if (!APPLY) {
  console.log('\n[DRY-RUN] No writes performed. Re-run with --apply to commit.');
  process.exit(errors.length ? 1 : 0);
}

if (errors.length) {
  console.log('\n✋ Refusing to apply while there are unresolved errors above. Fix the RENAMES list and re-run.');
  process.exit(1);
}

if (plan.length === 0) {
  console.log('\nNothing to do. Exiting.');
  process.exit(0);
}

console.log(`\nApplying ${plan.length} duplications (${plan.length * 2} writes) in batches of ${BATCH_SIZE}...`);
let done = 0;
for (let i = 0; i < plan.length; i += BATCH_SIZE) {
  const chunk = plan.slice(i, i + BATCH_SIZE);
  const batch = writeBatch(db);
  for (const p of chunk) {
    // 1) new doc — copy of old, with new name + isDefault true + provenance.
    //    `_id` is never stored (derived from doc.id at read time), so we don't set it.
    const newRef = doc(collection(db, COLLECTION));
    const { _id, createdAt, updatedAt, ...rest } = p.oldData;
    batch.set(newRef, {
      ...rest,
      name: p.newName,
      isDefault: true,
      duplicatedFrom: p.oldId,
      createdAt: now,
      updatedAt: now,
    });
    // 2) old doc — drop out of the default seeding; name/version untouched.
    batch.update(doc(db, COLLECTION, p.oldId), { isDefault: false, updatedAt: now });
  }
  await batch.commit();
  done += chunk.length;
  console.log(`  committed ${done}/${plan.length}`);
}

console.log(`\n✅ Done. ${done} templateElements duplicated and old docs set to isDefault=false.`);
process.exit(0);
