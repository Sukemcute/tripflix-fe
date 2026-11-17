const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 };
function load(path, sandbox = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(join(__dirname, path), 'utf8'), { compilerOptions }).outputText, {
    exports,
    ...sandbox,
  });
  return exports;
}
// Bộ mã dùng chung nằm trong app-core; model mobile chỉ import nó lúc chạy.
const survey = load('../packages/app-core/src/travel-survey.ts');
const moduleExports = load('../apps/mobile/src/features/onboarding/onboarding-model.ts', {
  require: (id) => {
    assert.equal(id, '@tripflix/app-core');
    return survey;
  },
});
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
assert.deepEqual(plain(recordFromProfile(completed).interests), ['coast', 'food']);
const legacy = { ...completed, interests: ['coast', 'legacy-code'] };
assert.deepEqual(plain(recordFromProfile(legacy).interests), ['coast']);
const payload = profilePreferences(
  { ...emptyOnboarding(), interests: ['culture'], pace: 'slow' },
  'completed',
  legacy,
);
assert.deepEqual(plain(payload.interests), ['culture', 'legacy-code']);
assert.deepEqual(plain(payload.regions), ['south']);
assert.deepEqual(plain(payload.budgetLevels), ['moderate']);
assert(!('pace' in payload), 'pace is not supported by the profile API');
console.log(
  'Profile policy: password/Google, null/skipped/completed, authoritative server state and lossless profile mapping passed.',
);
