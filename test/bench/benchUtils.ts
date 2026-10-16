/**
 * `parseToonDocument` keeps a small FIFO cache (10 entries) keyed by the source text.
 * Benchmarks that want to measure an actual parse rotate through more distinct variants
 * than the cache can hold, so every call is a cache miss.
 */
const CACHE_BUSTING_VARIANTS = 16;

export function createSourceRotation(source: string): () => string {
  const variants = Array.from(
    { length: CACHE_BUSTING_VARIANTS },
    (_value, index) => `${source}\n# bench-variant:${index}`
  );
  let cursor = 0;
  return () => {
    const next = variants[cursor];
    cursor = (cursor + 1) % variants.length;
    return next;
  };
}

export function buildMultiBlockDocument(blockCount: number, rowsPerBlock: number): string {
  const blocks: string[] = [];
  for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
    const lines = [
      `# block ${blockIndex}`,
      `block_${blockIndex}[${rowsPerBlock}]{id,name,email,active,score}:`,
    ];
    for (let rowIndex = 0; rowIndex < rowsPerBlock; rowIndex += 1) {
      lines.push(
        `  ${rowIndex},"User ${blockIndex}-${rowIndex}",user${rowIndex}@example.com,${
          rowIndex % 2 === 0
        },${(rowIndex * 1.5).toFixed(1)}`
      );
    }
    blocks.push(lines.join('\n'));
  }
  return blocks.join('\n\n');
}

export function buildUnformattedDocument(rowCount: number): string {
  const lines = [`users[${rowCount}]{id, name, role, city}:   `];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    lines.push(
      `      ${rowIndex},  "Name, ${rowIndex}" ,role_${rowIndex % 5},   City ${rowIndex}   `
    );
  }
  return lines.join('\n');
}

export function buildInvalidDocument(rowCount: number): string {
  // Declared row count is wrong, a field is duplicated, and every third row is short.
  const lines = [`broken[${rowCount + 7}]{id,name,name,status}:`];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    lines.push(
      rowIndex % 3 === 0 ? `  ${rowIndex},only` : `  ${rowIndex},a${rowIndex},b${rowIndex},ok`
    );
  }
  return lines.join('\n');
}

export function buildJsonRecords(rowCount: number): { users: Record<string, unknown>[] } {
  return {
    users: Array.from({ length: rowCount }, (_value, index) => ({
      id: index,
      name: `User, ${index}`,
      email: `user${index}@example.com`,
      active: index % 2 === 0,
      score: index * 1.25,
      note: index % 7 === 0 ? null : `say "hi" ${index}`,
    })),
  };
}
