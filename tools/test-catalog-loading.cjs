// Offline regression: execute the production bootstrap against isolated data.
// HTTP faults replace fetch only; catalog validation and overlays run unchanged.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const { webcrypto, createHash } = require('crypto');

const layout = fs.readFileSync(process.argv[2] || 'app/layout-r3.js', 'utf8');
const R41 = 'data/approved-r4-1.json';
const R15 = 'data/published-r15.json';

function recipe(id, prefix = 'inline') {
  return {
    id, name: 'Synthetic ' + id, category: 'Synthetic tests',
    source: 'https://example.invalid/' + prefix + '/' + id,
    ingredients: ['1 g synthetic ingredient ' + id],
    steps: ['Synthetic test step ' + id], photo: null,
  };
}

const original = Array.from({ length: 478 }, (_, i) => recipe('BASE-' + i));
const editorial = Array.from({ length: 54 }, (_, i) => ({
  ...recipe('EDITORIAL-' + i, 'editorial'),
  reviewedRecordSha256: 'a'.repeat(64), baseRecordSha256: 'b'.repeat(64),
}));
const manifest = {
  schema: 'sapore.app.editorial-import.v1',
  editorial_revision: 'CUR-20261117-FONTE-R4.1',
  new_recipe_count: 54, recipes: editorial,
  existingMatches: Array.from({ length: 10 }, (_, i) => ({ id: 'BASE-' + i })),
};
const independent = { ...recipe('PUBLISHED-NEW', 'publication'), reviewedRecordSha256: 'c'.repeat(64) };

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function overlay(base, tag = 'updated') {
  const reviewed = 'd'.repeat(64);
  return { ...base, name: 'Synthetic ' + tag + ' ' + base.id,
    ingredients: ['2 g synthetic ' + tag + ' ' + base.id],
    steps: ['Synthetic revised step ' + base.id], reviewedRecordSha256: reviewed,
    publicationUpdate: { baseAppSha256: digest(base), previousAppSha256: digest(base), reviewedDigest: reviewed } };
}

function response(data, mode) {
  if (mode === 'network') return Promise.reject(new TypeError('Synthetic network fault'));
  return Promise.resolve({
    ok: mode !== 'http', status: mode === 'http' ? 503 : 200,
    json: async () => {
      if (mode === 'json') throw new SyntaxError('Synthetic invalid JSON');
      return structuredClone(mode === 'manifest' ? { schema: 'invalid', recipes: [] } : data);
    },
  });
}

function create(options = {}) {
  const events = new Map(), calls = [], logs = [];
  const sandbox = {
    RECIPES: structuredClone(original),
    SAPORE_ORIGINAL_RECORDS: new Map(original.map(row => [row.id, structuredClone(row)])),
    CATEGORIES: ['Synthetic tests'], recipeSearchCache: null, pantryIndexCache: null,
    draw() {}, openRecipeDeepLink() {}, crypto: webcrypto, TextEncoder, URL,
    AbortController, clearTimeout,
    setTimeout(callback, delay, ...args) {
      return setTimeout(callback, options.fastTimeout && delay === 12000 ? 1 : delay, ...args);
    },
    console: { warn: (...args) => logs.push(args), error: (...args) => logs.push(args), log() {} },
    window: { addEventListener(name, callback) { events.set(name, callback); } },
    fetch(url, init) {
      calls.push(url);
      if (options.fetchOverride) {
        const replaced = options.fetchOverride(url, init);
        if (replaced !== undefined) return replaced;
      }
      if (url === R41) return response(options.editorial || manifest, options.r41);
      if (url === R15) return response({ schema: 'sapore.app.published.v1', recipes: options.feed || [independent] }, options.r15);
      return Promise.reject(new Error('Unexpected fixture request: ' + url));
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(layout, sandbox, { filename: 'app/layout-r3.js' });
  assert.equal(typeof events.get('DOMContentLoaded'), 'function', 'production bootstrap registers a DOMContentLoaded listener');
  const started = events.get('DOMContentLoaded')();
  return { sandbox, calls, logs, started };
}

async function start(options = {}) {
  const env = create(options);
  const ready = env.sandbox.window.__saporeCatalogReady || env.started;
  if (ready && typeof ready.then === 'function') await ready;
  // The old bootstrap does not return its promise. Flush the observable fetch
  // chain without substituting the production bootstrap or its validators.
  else for (let i = 0; i < 30; i++) await new Promise(resolve => setImmediate(resolve));
  return env;
}

function find(env, id) {
  return env.sandbox.RECIPES.find(row => row.id === id);
}

function assertOriginal(env, exceptions = []) {
  for (const row of original) {
    if (!exceptions.includes(row.id)) {
      assert.deepEqual(JSON.parse(JSON.stringify(find(env, row.id))), row,
        'inline baseline retained: ' + row.id);
    }
  }
}

(async () => {
  const checks = [];
  for (const mode of ['http', 'network', 'json', 'manifest']) {
    const env = await start({ r41: mode });
    assert.ok(env.calls.includes(R15), 'R41 ' + mode + ' failure must not suppress the independent R15 request');
    assertOriginal(env);
    assert.ok(find(env, independent.id), 'independent publication remains available');
    assert.equal(env.sandbox.window.__saporeEditorialImport.status, 'error');
    checks.push('R41 ' + mode + ' failure preserves inline catalog and independent publications');
  }

  const invalid = structuredClone(manifest);
  invalid.recipes[53].id = invalid.recipes[0].id;
  const atomic = await start({ editorial: invalid });
  assertOriginal(atomic);
  assert.equal(atomic.sandbox.RECIPES.filter(row => row.id.startsWith('EDITORIAL-')).length, 0,
    'one invalid editorial record rejects the entire untrusted batch');
  assert.ok(find(atomic, independent.id));
  checks.push('invalid R41 batch cannot partially mutate the catalog');

  for (const mode of ['http', 'network', 'json', 'manifest']) {
    const env = await start({ r15: mode });
    assertOriginal(env);
    assert.equal(env.sandbox.RECIPES.length, 532, 'R15 fault retains successful R41 baseline');
    assert.equal(env.sandbox.window.__saporeEditorialImport.status, 'loaded');
    assert.equal(env.sandbox.window.__saporePublicationImport.status, 'error');
    checks.push('R15 ' + mode + ' failure preserves the loaded baselines');
  }

  const healthy = await start();
  assertOriginal(healthy);
  assert.equal(healthy.sandbox.RECIPES.length, 533);
  assert.deepEqual(healthy.calls, [R41, R15], 'healthy dependency ordering remains R41 then R15');
  assert.equal(new Set(healthy.sandbox.RECIPES.map(row => row.id)).size, 533);
  checks.push('healthy load preserves baselines and adds each publication once');

  const nativeUpdate = overlay(recipe('PUBLISHED-NATIVE', 'publication'), 'native revision');
  const inlineUpdate = overlay(original[0], 'inline revision');
  const editorialUpdate = overlay(editorial[0], 'editorial revision');
  const recovering = { r41: 'http', feed: [independent, inlineUpdate, editorialUpdate, nativeUpdate] };
  const degraded = await start(recovering);
  assertOriginal(degraded, [original[0].id]);
  assert.equal(find(degraded, original[0].id).reviewedRecordSha256, inlineUpdate.reviewedRecordSha256,
    'an inline overlay still has a verified immutable baseline when R41 is unavailable');
  assert.ok(find(degraded, independent.id));
  assert.equal(find(degraded, editorialUpdate.id), undefined, 'missing R41 baseline is not replaced by an unverified update');
  assert.equal(find(degraded, nativeUpdate.id), undefined, 'an absent-ID update waits until the whole baseline is available');
  assert.equal(degraded.sandbox.window.__saporeCatalogLoad.status, 'partial');
  assert.equal(degraded.sandbox.window.__saporeCatalogLoad.canRetry, true);
  checks.push('degraded catalog loads independent records and valid inline overlays, holding absent-ID updates');

  recovering.r41 = undefined;
  await degraded.sandbox.retrySaporeCatalog();
  assertOriginal(degraded, [original[0].id]);
  assert.equal(find(degraded, editorialUpdate.id).name, editorialUpdate.name);
  assert.equal(find(degraded, nativeUpdate.id).name, nativeUpdate.name,
    'a structurally valid native R15 revision remains supported once the full baseline proves the ID is absent');
  assert.equal(degraded.sandbox.RECIPES.length, 534);
  assert.equal(new Set(degraded.sandbox.RECIPES.map(row => row.id)).size, 534);
  assert.equal(degraded.sandbox.window.__saporeCatalogLoad.status, 'loaded');
  assert.equal(degraded.sandbox.window.__saporeCatalogLoad.canRetry, false);
  const recoveredCalls = degraded.calls.length;
  await degraded.sandbox.retrySaporeCatalog();
  assert.equal(degraded.calls.length, recoveredCalls, 'complete recovery does not start another fetch');
  checks.push('retry recovers R41 and held updates without duplicating successful publications');

  const native = await start({ feed: [nativeUpdate] });
  assertOriginal(native);
  assert.equal(native.sandbox.RECIPES.length, 533);
  assert.equal(find(native, nativeUpdate.id).name, nativeUpdate.name);
  assert.equal(native.sandbox.window.__saporeCatalogLoad.status, 'loaded');
  checks.push('healthy bootstrap preserves valid revisions born in the R15 publication feed');

  const invalidProof = { ...nativeUpdate, id: 'PUBLISHED-BAD-PROOF', source: 'https://example.invalid/bad-proof',
    ingredients: ['1 g invalid-proof fixture'], publicationUpdate: { ...nativeUpdate.publicationUpdate, baseAppSha256: 'not-a-hash' } };
  const replayOptions = { feed: [editorialUpdate, independent, invalidProof] };
  const replay = await start(replayOptions);
  assert.equal(find(replay, invalidProof.id), undefined, 'absent-ID update still needs a structurally valid proof');
  assert.equal(find(replay, editorialUpdate.id).name, editorialUpdate.name);
  assert.equal(replay.sandbox.window.__saporeCatalogLoad.status, 'partial');
  replayOptions.feed = [editorialUpdate, independent];
  await replay.sandbox.retrySaporeCatalog();
  assert.equal(replay.calls.filter(url => url === R41).length, 1, 'a successfully loaded R41 baseline is not fetched or added again');
  assert.equal(find(replay, editorialUpdate.id).name, editorialUpdate.name, 'R41 overlay replay uses its immutable original baseline');
  assert.equal(replay.sandbox.RECIPES.length, 533);
  assert.equal(new Set(replay.sandbox.RECIPES.map(row => row.id)).size, 533);
  assert.equal(replay.sandbox.window.__saporeCatalogLoad.status, 'loaded', 'already_present records are benign during recovery');
  checks.push('retry retains R41 baseline proof and treats unchanged records as an idempotent replay');

  const failed = await start({ r41: 'http', r15: 'http' });
  assertOriginal(failed);
  assert.equal(failed.sandbox.window.__saporeCatalogLoad.attempts, 1);
  const firstRetry = failed.sandbox.retrySaporeCatalog();
  const concurrentRetry = failed.sandbox.retrySaporeCatalog();
  assert.equal(firstRetry, concurrentRetry, 'concurrent retry calls share one in-flight operation');
  await firstRetry;
  assert.equal(failed.sandbox.window.__saporeCatalogLoad.attempts, 2);
  await failed.sandbox.retrySaporeCatalog();
  assert.equal(failed.sandbox.window.__saporeCatalogLoad.attempts, 3);
  assert.equal(failed.sandbox.window.__saporeCatalogLoad.maxAttempts, 3);
  assert.equal(failed.sandbox.window.__saporeCatalogLoad.canRetry, false);
  const exhaustedCalls = failed.calls.length;
  await failed.sandbox.retrySaporeCatalog();
  assert.equal(failed.calls.length, exhaustedCalls, 'the exhausted retry budget never sends another request');
  assert.equal(exhaustedCalls, 6, 'three serialized cycles make one request per unavailable feed');
  assertOriginal(failed);
  checks.push('retries are coalesced and bounded to the initial attempt plus two manual retries');

  // Keep these independent so one failed regression does not hide the others.
  const additional = [
    ['metadata-only update with a wrong immutable baseline remains a visible conflict', async () => {
      const reviewed = 'e'.repeat(64);
      for (const baseline of [original[0], editorial[0]]) {
        const changed = { ...baseline, name: 'Synthetic unauthorized metadata change',
          reviewedRecordSha256: reviewed, publicationUpdate: {
            baseAppSha256: '0'.repeat(64), previousAppSha256: digest(baseline), reviewedDigest: reviewed,
          } };
        const env = await start({ feed: [changed] });
        assertOriginal(env);
        assert.deepEqual(JSON.parse(JSON.stringify(find(env, baseline.id))), baseline,
          'matching previous record does not relax an immutable inline or R41 baseline');
        assert.equal(env.sandbox.window.__saporeCatalogLoad.status, 'partial',
          'same culinary fingerprint does not make conflicting metadata already present');
        assert.ok(env.sandbox.window.__saporePublicationImport.skipped.some(row => row.id === changed.id && row.reason !== 'already_present'));
      }
    }],
    ['native R15 successor needs the exact previous revision and the unchanged base identity', async () => {
      const a = nativeUpdate;
      const reviewed = 'e'.repeat(64);
      const b = { ...a, name: 'Synthetic native revision B', ingredients: ['3 g native successor ingredient'],
        reviewedRecordSha256: reviewed, publicationUpdate: {
          baseAppSha256: a.publicationUpdate.baseAppSha256,
          previousAppSha256: digest(a), reviewedDigest: reviewed,
        } };
      const options = { feed: [a, invalidProof] };
      const env = await start(options);
      assert.equal(env.sandbox.window.__saporeCatalogLoad.status, 'partial');
      options.feed = [b];
      await env.sandbox.retrySaporeCatalog();
      assert.equal(find(env, a.id).name, b.name, 'a native successor arriving during recovery applies against the exact previous record');
      assert.equal(env.sandbox.window.__saporeCatalogLoad.status, 'loaded');
      assertOriginal(env);
      for (const field of ['previousAppSha256', 'baseAppSha256']) {
        const rejectedOptions = { feed: [a, invalidProof] };
        const rejected = await start(rejectedOptions);
        rejectedOptions.feed = [{ ...b, publicationUpdate: { ...b.publicationUpdate, [field]: '0'.repeat(64) } }];
        await rejected.sandbox.retrySaporeCatalog();
        assert.equal(find(rejected, a.id).name, a.name, 'wrong ' + field + ' cannot replace a native revision');
        assert.equal(rejected.sandbox.window.__saporeCatalogLoad.status, 'partial');
      }
    }],
    ['R41 timeout aborts the request, continues R15 and ignores a late response', async () => {
      let release, signal;
      const env = await start({ fastTimeout: true, fetchOverride(url, init) {
        if (url !== R41) return undefined;
        signal = init.signal;
        return new Promise(resolve => { release = resolve; });
      } });
      assert.equal(signal.aborted, true, 'the expired request receives an abort signal');
      assert.ok(env.calls.includes(R15), 'an unresponsive R41 server cannot prevent the R15 request');
      assertOriginal(env);
      assert.ok(find(env, independent.id));
      assert.equal(env.sandbox.window.__saporeCatalogLoad.status, 'partial');
      const before = canonical(env.sandbox.RECIPES);
      release({ ok: true, status: 200, json: async () => structuredClone(manifest) });
      for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
      assert.equal(canonical(env.sandbox.RECIPES), before, 'late abandoned R41 response never mutates the live catalog');
      assert.equal(env.sandbox.window.__saporeEditorialImport.status, 'error');
    }],
  ];
  const results = await Promise.allSettled(additional.map(async ([label, test]) => { await test(); return label; }));
  const failures = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') checks.push(results[i].value);
    else failures.push({ check: additional[i][0], message: results[i].reason.message });
  }
  assert.equal(failures.length, 0, JSON.stringify(failures));
  console.log(JSON.stringify({ status: 'PASS', count: checks.length, checks }));
})().catch(error => { console.error(error); process.exitCode = 1; });
