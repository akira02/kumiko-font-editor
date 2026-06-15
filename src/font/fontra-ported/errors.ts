// ported from fontra eae93be (2026.6.2)
// source: src-js/fontra-core/src/errors.js
// Keep in sync — see docs/fontra-parity.md

export class VariationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}
