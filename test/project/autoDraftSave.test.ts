import { describe, expect, it } from 'vitest'
import { AUTO_DRAFT_SAVE_DELAY_MS } from 'src/hooks/useAutoDraftSave'

describe('auto draft save timing', () => {
  it('uses a short debounce window for canonical draft persistence', () => {
    expect(AUTO_DRAFT_SAVE_DELAY_MS).toBeGreaterThanOrEqual(1_000)
    expect(AUTO_DRAFT_SAVE_DELAY_MS).toBeLessThanOrEqual(10_000)
  })
})
