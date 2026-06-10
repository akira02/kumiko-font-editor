// Convert the BabelStone IDS database (https://www.babelstone.co.uk/CJK/IDS.TXT)
// into the tab-separated format consumed by componentSearchWorker:
//   <char>\t<primary IDS>\t<alt IDS 1>;<alt IDS 2>...
//
// Usage:
//   node scripts/build-ids-data.mjs [path-to-IDS.TXT]
// Downloads the latest IDS.TXT when no local path is given, then writes
// public/ids/ids_babelstone.txt.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const IDS_URL = 'https://www.babelstone.co.uk/CJK/IDS.TXT'
const OUTPUT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'ids',
  'ids_babelstone.txt'
)

// Excluded source tags: X (virtual shapes), O (obsolete) describe shapes
// that don't correspond to actual encoded usage.
const EXCLUDED_TAGS = new Set(['X', 'O'])
// Region priority for picking the primary sequence (Taiwan-first to match
// the editor's traditional-Chinese audience).
const REGION_PRIORITY = ['T', 'H', 'G', 'J', 'K', 'V', 'P', 'U']
const MAX_ALTERNATIVES = 5

// Marks that annotate an IDS but are not components themselves.
const STRIP_PATTERN = /[〾↔↷゚︀-️]/gu

const loadSource = async () => {
  const localPath = process.argv[2]
  if (localPath) {
    return readFileSync(localPath, 'utf-8')
  }
  const response = await fetch(IDS_URL)
  if (!response.ok) {
    throw new Error(`Failed to download IDS.TXT: HTTP ${response.status}`)
  }
  return response.text()
}

const parseSequenceColumn = (column) => {
  const match = column.match(/^\^(.*)\$(?:\(([^)]*)\))?$/u)
  if (!match) {
    return null
  }
  const ids = match[1].replace(STRIP_PATTERN, '').trim()
  if (!ids) {
    return null
  }
  const tags = match[2] ? [...match[2]] : []
  return { ids, tags }
}

const regionRank = (tags) => {
  let best = REGION_PRIORITY.length
  for (const tag of tags) {
    const rank = REGION_PRIORITY.indexOf(tag)
    if (rank >= 0 && rank < best) {
      best = rank
    }
  }
  return best
}

const main = async () => {
  const text = await loadSource()
  const lines = []
  let entryCount = 0

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^﻿/, '').trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const columns = line.split('\t')
    const char = columns[1]
    if (!char || [...char].length !== 1) {
      continue
    }

    const sequences = columns
      .slice(2)
      .map(parseSequenceColumn)
      .filter(Boolean)
      .filter(
        (sequence) =>
          sequence.tags.length === 0 ||
          sequence.tags.some((tag) => !EXCLUDED_TAGS.has(tag))
      )
      // Skip atomic entries (the char decomposing to itself).
      .filter((sequence) => sequence.ids !== char)

    if (sequences.length === 0) {
      continue
    }

    sequences.sort(
      (left, right) => regionRank(left.tags) - regionRank(right.tags)
    )
    const unique = [...new Set(sequences.map((sequence) => sequence.ids))]
    const primary = unique[0]
    const alternatives = unique.slice(1, 1 + MAX_ALTERNATIVES)

    lines.push(`${char}\t${primary}\t${alternatives.join(';')}`)
    entryCount += 1
  }

  writeFileSync(OUTPUT_PATH, `${lines.join('\n')}\n`, 'utf-8')
  console.log(`Wrote ${entryCount} entries to ${OUTPUT_PATH}`)
}

await main()
