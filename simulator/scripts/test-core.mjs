import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const result = await build({
  entryPoints: ['src/core/selftest.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
})

mkdirSync('node_modules/.msap-test', { recursive: true })
const outfile = 'node_modules/.msap-test/selftest.mjs'
writeFileSync(outfile, result.outputFiles[0].text)

const { runSelfTest } = await import(pathToFileURL(outfile))
const report = runSelfTest()

for (const name of report.passed) console.log(`  ok  ${name}`)
for (const failure of report.failed) console.error(`FAIL  ${failure.name}\n      ${failure.reason}`)
console.log(`\n${report.passed.length} passed, ${report.failed.length} failed`)
process.exit(report.failed.length === 0 ? 0 : 1)
