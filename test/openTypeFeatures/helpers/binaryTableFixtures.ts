// Shared SFNT byte-writing primitives for binary OpenType inventory tests.
// Extracted verbatim from the three inventory suites to remove duplication;
// each suite keeps its own table builders on top of these.

export interface TableFixture {
  tag: string
  data: Uint8Array
}

export const TRUE_TYPE_SCALER = [0x00, 0x01, 0x00, 0x00]

export const align4 = (value: number) => Math.ceil(value / 4) * 4

export const writeTag = (view: DataView, offset: number, tag: string) => {
  for (let index = 0; index < 4; index += 1) {
    view.setUint8(offset + index, tag.charCodeAt(index))
  }
}

export const writeUint16 = (view: DataView, offset: number, value: number) => {
  view.setUint16(offset, value, false)
}

export const writeUint32 = (view: DataView, offset: number, value: number) => {
  view.setUint32(offset, value, false)
}

export const makeBytes = (length: number, write: (view: DataView) => void) => {
  const bytes = new Uint8Array(length)
  write(new DataView(bytes.buffer))
  return bytes
}

export const makeSfnt = (tables: TableFixture[]) => {
  const directoryLength = 12 + tables.length * 16
  const tableOffsets: number[] = []
  let cursor = align4(directoryLength)

  for (const table of tables) {
    tableOffsets.push(cursor)
    cursor = align4(cursor + table.data.byteLength)
  }

  const bytes = new Uint8Array(cursor)
  const view = new DataView(bytes.buffer)
  TRUE_TYPE_SCALER.forEach((byte, index) => view.setUint8(index, byte))
  writeUint16(view, 4, tables.length)

  tables.forEach((table, index) => {
    const recordOffset = 12 + index * 16
    writeTag(view, recordOffset, table.tag)
    writeUint32(view, recordOffset + 4, 0)
    writeUint32(view, recordOffset + 8, tableOffsets[index])
    writeUint32(view, recordOffset + 12, table.data.byteLength)
    bytes.set(table.data, tableOffsets[index])
  })

  return bytes.buffer
}
