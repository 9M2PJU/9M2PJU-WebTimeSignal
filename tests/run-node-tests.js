/**
 * Node.js CLI Test Runner
 */

import { TestRunner, registerAllTests } from './test-suite.js';

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

    if (res.failed > 0) {
        process.exit(1);
    }
}).catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
