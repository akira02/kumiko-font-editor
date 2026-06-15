// ported from fontra eae93be (2026.6.2)
// source: src-js/fontra-core/src/utils.ts (subset)
// Only the pure Python-like iteration/math helpers used by the other ported
// modules are included here. Keep in sync — see docs/fontra-parity.md

export function* enumerate<T>(iterable: Iterable<T>, start = 0) {
  let i = start
  for (const item of iterable) {
    yield [i, item] as [number, T]
    i++
  }
}

export function* reversedEnumerate<T>(seq: T[]) {
  for (let i = seq.length - 1; i >= 0; i--) {
    yield [i, seq[i]] as [number, T]
  }
}

export function* range(start: number, stop?: number, step = 1) {
  if (stop === undefined) {
    stop = start
    start = 0
  }
  if (step > 0) {
    for (let i = start; i < stop; i += step) {
      yield i
    }
  } else if (step < 0) {
    for (let i = start; i > stop; i += step) {
      yield i
    }
  }
}

// After Python's itertools.product()
export function* product<T>(
  ...args: Iterable<T>[]
): Generator<T[], void, unknown> {
  if (!args.length) {
    yield []
    return
  }
  const first = args[0]
  args = args.slice(1)
  if (args.length) {
    for (const v of first) {
      const prod = [...product(...args)]
      for (const w of prod) {
        yield [v, ...w]
      }
    }
  } else {
    for (const v of first) {
      yield [v]
    }
  }
}

export function* iter<T>(iterable: Iterable<T>) {
  for (const item of iterable) {
    yield item
  }
}

export function* zip(...args: Iterable<any>[]) {
  const iterators = args.map((arg) => iter(arg))
  while (true) {
    const results = iterators.map((it) => it.next())
    if (results.some((r) => r.done)) {
      if (!results.every((r) => r.done)) {
        throw new Error('zip: input arguments have different lengths')
      }
      break
    }
    yield results.map((r) => r.value)
  }
}

export function clamp(number: number, min: number, max: number) {
  return Math.max(Math.min(number, max), min)
}

const _digitFactors = [1, 10, 100, 1000, 10000]

export function round(number: number, nDigits = 0) {
  if (nDigits === 0) {
    return Math.round(number)
  }
  const factor = _digitFactors[nDigits]
  if (!factor) {
    throw new RangeError('nDigits out of range')
  }
  return Math.round(number * factor) / factor
}

// Return true if `obj` has no properties
export function isObjectEmpty(obj: any) {
  for (const _ in obj) {
    return false
  }
  return true
}
