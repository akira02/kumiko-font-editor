// ported from fontra eae93be (2026.6.2)
// source: src-js/fontra-core/src/set-ops.js (subset)
// Only isSuperset is used by the ported variation model. Keep in sync —
// see docs/fontra-parity.md

export function isSuperset<T>(set: Set<T>, subset: Iterable<T>) {
  for (const elem of subset) {
    if (!set.has(elem)) {
      return false
    }
  }
  return true
}
