// Quick manual smoke test for the parser layer. Run: node scripts/smoke-parsers.js
const { DotEnvParser, PropertiesParser, YamlParser } = require('../out/features/parsing');

const dotenv = new DotEnvParser().parse(
  [
    '# comment line',
    'APP_NAME=EnvGuard',
    'export APP_KEY="base64:abc123"',
    "QUOTED='hello world' # trailing ignored",
    'WITH_COMMENT=plain value # trailing comment',
    'EMPTY=',
    'not a valid line',
    '1BAD_KEY=skipped',
  ].join('\n'),
  '.env',
);

const props = new PropertiesParser().parse(
  [
    '# comment',
    '! also a comment',
    'spring.datasource.url=jdbc:mysql://localhost/db',
    'server.port: 8080',
    'long.value=first part \\',
    '    second part',
    'weird\\=key=has escaped separator',
  ].join('\n'),
  'application.properties',
);

const yaml = new YamlParser().parse(
  [
    'spring:',
    '  datasource:',
    '    url: jdbc:mysql://localhost/db',
    '    username: root',
    'servers:',
    '  - alpha',
    '  - beta',
    'empty-key:',
    '---',
    'spring:',
    '  profiles: dev',
  ].join('\n'),
  'application.yml',
);

console.log('--- DotEnvParser ---');
console.table(dotenv);
console.log('--- PropertiesParser ---');
console.table(props);
console.log('--- YamlParser ---');
console.table(yaml);

const assert = require('assert');
assert.deepStrictEqual(
  dotenv.map((e) => [e.key, e.value]),
  [
    ['APP_NAME', 'EnvGuard'],
    ['APP_KEY', 'base64:abc123'],
    ['QUOTED', 'hello world'],
    ['WITH_COMMENT', 'plain value'],
    ['EMPTY', ''],
  ],
);
assert.deepStrictEqual(
  props.map((e) => [e.key, e.value]),
  [
    ['spring.datasource.url', 'jdbc:mysql://localhost/db'],
    ['server.port', '8080'],
    ['long.value', 'first part second part'],
    ['weird=key', 'has escaped separator'],
  ],
);
assert.deepStrictEqual(
  yaml.map((e) => [e.key, e.value]),
  [
    ['spring.datasource.url', 'jdbc:mysql://localhost/db'],
    ['spring.datasource.username', 'root'],
    ['servers[0]', 'alpha'],
    ['servers[1]', 'beta'],
    ['empty-key', ''],
    ['spring.profiles', 'dev'],
  ],
);
// --- EnvironmentParserService routing (VS Code-free, so testable here) ---
const { EnvironmentParserService, createParsers } = require('../out/features/parsing');
const service = new EnvironmentParserService(createParsers());

assert.strictEqual(service.formatOf('.env'), 'dotenv');
assert.strictEqual(service.formatOf('.env.production'), 'dotenv');
assert.strictEqual(service.formatOf('.env.example'), 'dotenv');
assert.strictEqual(service.formatOf('application.properties'), 'properties');
assert.strictEqual(service.formatOf('application.yml'), 'yaml');
assert.strictEqual(service.formatOf('application-dev.yaml'), 'yaml');
assert.strictEqual(service.formatOf('docker-compose.yml'), undefined);
assert.strictEqual(service.formatOf('package.json'), undefined);
assert.strictEqual(service.supports('.envrc'), false);
assert.deepStrictEqual(
  service.parse('.env', 'A=1', '.env').map((e) => [e.key, e.value]),
  [['A', '1']],
);
assert.throws(() => service.parse('readme.md', 'x', 'readme.md'), /No parser registered/);

// --- ComparisonService (pure logic, testable here) ---
const { ComparisonService } = require('../out/features/comparison/ComparisonService');
const comparison = new ComparisonService();

const makeFile = (relativePath, format, pairs) => ({
  fsPath: 'C:/fake/' + relativePath,
  relativePath,
  name: relativePath.split('/').pop(),
  format,
  entries: pairs.map(([key, value]) => ({ key, value, file: relativePath })),
});

// Two-file diff: .env.example (base) vs .env (target)
const example = makeFile('.env.example', 'dotenv', [
  ['APP_NAME', 'MyApp'],
  ['APP_KEY', ''],
  ['DB_HOST', 'localhost'],
  ['DB_HOST', '127.0.0.1'], // duplicate: last occurrence wins
]);
const env = makeFile('.env', 'dotenv', [
  ['APP_NAME', 'MyApp'],
  ['DB_HOST', '127.0.0.1'],
  ['DEBUG', 'true'],
]);
const diff = comparison.compare(example, env);
assert.deepStrictEqual(diff.missingKeys, ['APP_KEY']);
assert.deepStrictEqual(diff.extraKeys, ['DEBUG']);
assert.deepStrictEqual(diff.differences, []); // DB_HOST matches via last-wins
assert.strictEqual(diff.baseFile, '.env.example');
assert.strictEqual(diff.targetFile, '.env');

// Value differences are reported
const diff2 = comparison.compare(
  makeFile('a/.env', 'dotenv', [['PORT', '3000']]),
  makeFile('b/.env', 'dotenv', [['PORT', '8080']]),
);
assert.deepStrictEqual(diff2.differences, [
  { key: 'PORT', baseValue: '3000', targetValue: '8080' },
]);

// Cross-file audit: the exact spec example — APP_KEY missing from .env.production
const audit = comparison.findMissingKeys([
  makeFile('.env', 'dotenv', [
    ['APP_NAME', 'x'],
    ['APP_KEY', 'secret'],
  ]),
  makeFile('.env.production', 'dotenv', [['APP_NAME', 'x']]),
  // Different format group: must NOT produce cross-format noise
  makeFile('application.yml', 'yaml', [['spring.datasource.url', 'jdbc:...']]),
]);
assert.deepStrictEqual(audit.missingKeys, [
  { key: 'APP_KEY', presentIn: ['.env'], missingFrom: ['.env.production'] },
]);
assert.deepStrictEqual(audit.scannedFiles, ['.env', '.env.production', 'application.yml']);

// Single file in a group → nothing to audit against
assert.deepStrictEqual(
  comparison.findMissingKeys([makeFile('.env', 'dotenv', [['A', '1']])]).missingKeys,
  [],
);

// --- Report builder (pure, testable here) ---
const { buildReport } = require('../out/features/export-report');

const auditOnly = buildReport(audit);
assert.deepStrictEqual(auditOnly.missingKeys, audit.missingKeys);
assert.deepStrictEqual(auditOnly.extraKeys, []);
assert.deepStrictEqual(auditOnly.differences, []);
assert.strictEqual(auditOnly.comparison, undefined);
assert.ok(!Number.isNaN(Date.parse(auditOnly.generatedAt)));

const full = buildReport(audit, diff);
assert.deepStrictEqual(full.extraKeys, ['DEBUG']);
assert.deepStrictEqual(full.comparison, { baseFile: '.env.example', targetFile: '.env' });

// Spec shape: report.json must serialize with missingKeys/extraKeys/differences
const serialized = JSON.parse(JSON.stringify(full));
for (const field of ['missingKeys', 'extraKeys', 'differences', 'generatedAt']) {
  assert.ok(field in serialized, `report.json must contain "${field}"`);
}

console.log('All parser, parser-service, comparison, and report assertions passed.');
