/**
 * Node.js CLI Test Runner
 */

import { TestRunner, registerAllTests } from './test-suite.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

// Static regression checks (no DOM required)
function staticCheck(name, fn) {
    try {
        fn();
        console.log(`  [PASS] ${name}`);
    } catch (err) {
        console.error(`  [FAIL] ${name}`);
        console.error(`         Error: ${err.message || String(err)}`);
        failures.push(name);
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

const runner = new TestRunner();
registerAllTests(runner);

runner.runAll().then(res => {
    console.log('\n========================================');
    console.log(`9M2PJU WebTimeSignal Test Suite Results`);
    console.log('========================================\n');

    for (const r of res.results) {
        if (r.status === 'PASS') {
            console.log(`  [PASS] ${r.name}`);
        } else {
            console.error(`  [FAIL] ${r.name}`);
            console.error(`         Error: ${r.error}`);
        }
    }

    console.log('\n----------------------------------------');
    console.log(`Total: ${res.total} | Passed: ${res.passed} | Failed: ${res.failed}`);
    console.log('----------------------------------------\n');

    console.log('Static regression checks');
    console.log('----------------------------------------\n');

    staticCheck('Start/Stop button keeps inner spans (no data-i18n wipe)', () => {
        const html = readFileSync(join(rootDir, 'index.html'), 'utf8');
        const btn = html.match(/<button[^>]*id="btn-start-stop"[^>]*>/);
        assert(btn, 'btn-start-stop not found');
        assert(!btn[0].includes('data-i18n'), 'data-i18n on btn-start-stop would wipe its inner spans on language switch');
    });

    staticCheck('_headers global rule matches all paths', () => {
        const headers = readFileSync(join(rootDir, '_headers'), 'utf8');
        assert(/^\s*\/\*:/m.test(headers), 'global _headers rule must be "/*:" ("/:" matches nothing)');
    });

    staticCheck('CSP allows Cloudflare Insights beacon', () => {
        const html = readFileSync(join(rootDir, 'index.html'), 'utf8');
        const headers = readFileSync(join(rootDir, '_headers'), 'utf8');
        assert(html.includes('static.cloudflareinsights.com'), 'meta CSP must allow the beacon host used on live pages');
        assert(headers.includes('static.cloudflareinsights.com'), '_headers CSP must allow the beacon host used on live pages');
    });

    staticCheck('Version badge, service worker cache, and package.json agree', () => {
        const html = readFileSync(join(rootDir, 'index.html'), 'utf8');
        const sw = readFileSync(join(rootDir, 'sw.js'), 'utf8');
        const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
        const badge = html.match(/<span class="badge">v([^<]+)<\/span>/);
        assert(badge, 'version badge not found');
        assert(sw.includes(`web-time-signal-v${badge[1]}`), `sw.js cache name must contain badge version v${badge[1]}`);
        assert(pkg.version === badge[1], `package.json (${pkg.version}) must equal badge (${badge[1]})`);
    });

    staticCheck('playTestTone never rebuilds live audio graph', () => {
        const engine = readFileSync(join(rootDir, 'js/audio-engine.js'), 'utf8');
        const body = engine.slice(engine.indexOf('async playTestTone'));
        assert(body.includes('if (!this.ctx)'), 'playTestTone must guard init() behind if (!this.ctx)');
    });

    console.log('\n----------------------------------------');
    console.log(`Static checks failed: ${failures.length}`);
    console.log('----------------------------------------\n');

    if (res.failed > 0 || failures.length > 0) {
        process.exit(1);
    }
}).catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
