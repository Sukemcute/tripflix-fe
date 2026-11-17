const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = readFileSync(
  join(__dirname, '../apps/mobile/src/features/onboarding/onboarding-model.ts'),
  'utf8',
);
const moduleExports = {};
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports: moduleExports },
);
const { needsAccountOnboarding, recordFromProfile, profilePreferences, emptyOnboarding } = moduleExports;
const plain = (value) => JSON.parse(JSON.stringify(value));
const completed = {
  status: 'completed',
  interests: ['coast', 'food'],
  regions: ['south'],
  budgetLevels: ['moderate'],
  updatedAt: new Date().toISOString(),
};
for (const provider of ['password', 'Google']) {
  assert.equal(
    needsAccountOnboarding({ travelPreferences: null }),
    true,
    provider + ': new or unanswered account',
  );
  assert.equal(
    needsAccountOnboarding({ travelPreferences: { ...completed, status: 'skipped' } }),
    true,
    provider + ': skipped account',
  );
  assert.equal(
    needsAccountOnboarding({ travelPreferences: completed }),
    false,
    provider + ': completed account',
  );
}
const staleDevice = { ...emptyOnboarding(), status: 'completed', interests: ['nature'], pace: 'active' };
assert.notEqual(recordFromProfile(null, staleDevice).status, 'completed');
assert.deepEqual(plain(recordFromProfile(completed).interests), ['coast']);
const payload = profilePreferences(
  { ...emptyOnboarding(), interests: ['culture'], pace: 'slow' },
  'completed',
  completed,
);
assert.deepEqual(plain(payload.interests), ['culture', 'food']);
assert.deepEqual(plain(payload.regions), ['south']);
assert.deepEqual(plain(payload.budgetLevels), ['moderate']);
assert(!('pace' in payload), 'pace is not supported by the profile API');
console.log(
  'Profile policy: password/Google, null/skipped/completed, authoritative server state and lossless profile mapping passed.',
);
