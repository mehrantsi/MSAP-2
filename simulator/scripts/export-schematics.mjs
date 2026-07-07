import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const src = `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
import { buildNetlistModel, renderKicadNetlist } from '../../src/export/netlist'
import { renderKicadPcb } from '../../src/export/pcb'
import { renderAllKicadSch } from '../../src/export/kicadSch'
export const netlist = renderKicadNetlist(buildNetlistModel())
export const pcbTht = renderKicadPcb('tht')
export const pcbSmd = renderKicadPcb('smd')
export const sheets = renderAllKicadSch()
`
mkdirSync('node_modules/.msap-test', { recursive: true })
writeFileSync('node_modules/.msap-test/schem-entry.ts', src)
const result = await build({
  entryPoints: ['node_modules/.msap-test/schem-entry.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  absWorkingDir: process.cwd(),
})
const outfile = 'node_modules/.msap-test/schem-entry.mjs'
writeFileSync(outfile, result.outputFiles[0].text)
const { netlist, pcbTht, pcbSmd, sheets } = await import(pathToFileURL(outfile))
const dir = '../Schematics'
writeFileSync(`${dir}/MSAP-2 rev.A.net`, netlist)
writeFileSync(`${dir}/MSAP-2 rev.A.kicad_pcb`, pcbTht)
writeFileSync(`${dir}/MSAP-2 rev.A SMD.kicad_pcb`, pcbSmd)
mkdirSync(`${dir}/KiCad`, { recursive: true })
for (const sheet of sheets) writeFileSync(`${dir}/KiCad/${sheet.name}.kicad_sch`, sheet.content)
console.log(`netlist: ${(netlist.match(/\(comp /g) || []).length} components, ${sheets.length} kicad_sch sheets -> ${dir}`)
