// Build the glyph-name lookup table from Glyphs' GlyphData.xml.
//
// Glyphs 3 uses human-readable "nice names" (leftArrow) as the primary glyph
// name, with the AGL-style "production name" (arrowleft) reserved for the
// exported font's post table. CJK ideographs are NOT in this file; they follow
// the uniXXXX convention and are resolved algorithmically at runtime. This
// emits every named glyph so we can fill unicode/production and match Glyphs.
//
// Output format (tab-separated, one line per glyph):
//   <name>\t<unicode hex|>\t<production|>\t<altName,altName|>
//
// Usage:
//   node scripts/build-glyphdata.mjs [path-to-GlyphData.xml]
// Downloads the latest GlyphData.xml when no local path is given (BSD 3-Clause,
// Georg Seifert), then writes public/glyphsdata/glyphdata.txt. GlyphsInfo is
// updated periodically upstream; re-run this to sync.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SOURCE_URL =
  'https://raw.githubusercontent.com/schriftgestalt/GlyphsInfo/Glyphs3/GlyphData.xml'
const OUTPUT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'glyphsdata'
)
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'glyphdata.txt')

const loadSource = async () => {
  const localPath = process.argv[2]
  if (localPath) {
    return readFileSync(localPath, 'utf-8')
  }
  const response = await fetch(SOURCE_URL)
  if (!response.ok) {
    throw new Error(`Failed to download GlyphData.xml: HTTP ${response.status}`)
  }
  return response.text()
}

const attr = (line, key) => {
  const match = line.match(new RegExp(`${key}="([^"]*)"`))
  return match?.[1] ?? null
}

const main = async () => {
  const source = await loadSource()

  const lines = []
  for (const line of source.split('\n')) {
    if (!line.includes('<glyph ')) {
      continue
    }
    const name = attr(line, 'name')
    if (!name) {
      continue
    }
    const unicode = attr(line, 'unicode') ?? ''
    const production = attr(line, 'production') ?? ''
    // altNames may be comma- or space-separated upstream; normalise to commas.
    const altNames = (attr(line, 'altNames') ?? '')
      .split(/[,\s]+/)
      .filter(Boolean)
      .join(',')
    lines.push(`${name}\t${unicode}\t${production}\t${altNames}`)
  }

  lines.sort()
  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(OUTPUT_PATH, `${lines.join('\n')}\n`, 'utf-8')
  console.log(`Wrote ${lines.length.toLocaleString()} glyphs to ${OUTPUT_PATH}`)
}

await main()
