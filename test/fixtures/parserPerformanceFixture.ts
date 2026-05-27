export const PARSER_PERFORMANCE_FIXTURE_ROWS = 5000;
export const PARSER_PERFORMANCE_FIXTURE_FIELDS = 8;

export function buildParserPerformanceFixture(
  rowCount = PARSER_PERFORMANCE_FIXTURE_ROWS,
  fieldCount = PARSER_PERFORMANCE_FIXTURE_FIELDS
): string {
  const fields = Array.from({ length: fieldCount }, (_value, index) => `field_${index}`);
  const lines = [`items[${rowCount}]{${fields.join(',')}}:`];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const values = fields.map((_field, fieldIndex) => valueForCell(rowIndex, fieldIndex));
    lines.push(`  ${values.join(',')}`);
  }

  return lines.join('\n');
}

function valueForCell(rowIndex: number, fieldIndex: number): string {
  switch (fieldIndex % 4) {
    case 0:
      return `value_${rowIndex}_${fieldIndex}`;
    case 1:
      return `"quoted,${rowIndex},${fieldIndex}"`;
    case 2:
      return `"escaped ""quote"" ${rowIndex}_${fieldIndex}"`;
    default:
      return String(rowIndex * (fieldIndex + 1));
  }
}
