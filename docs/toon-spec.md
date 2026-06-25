# TOON Format Specification

TOON, Token-Oriented Object Notation, is a compact line-oriented representation for tabular data.
This document defines the TOON subset supported by TOON Tools VSX.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative.
Files **MUST** be UTF-8 text and normally use the `.toon` extension.

## Document Model

A TOON document is a sequence of zero or more blocks, comments, and blank lines.
A block represents one named table. Each block has a header and zero or more data rows.

A conforming parser **MUST** preserve block order, field order, row order, comment text, and source ranges when those ranges are available.
A conforming formatter **SHOULD** preserve the semantic content of block names, fields, values, comments, and row counts.

## Grammar

```ebnf
document      = { blank-line | comment | block } ;
block         = header, { row | blank-line | comment } ;
header        = block-name, "[", row-count, "]", "{", [ field-list ], "}", ":", whitespace ;
field-list    = field-name, { ",", field-name } ;
row           = indentation, value, { ",", value }, whitespace ;
value         = quoted-value | bare-value | empty-value ;
quoted-value  = '"', { '""' | ? any character except unescaped " ? }, '"' ;
bare-value    = ? any characters except comma or line break ? ;
empty-value   = "" ;
comment       = whitespace, "#", { ? any character except line break ? } ;
blank-line    = whitespace ;
block-name    = letter-or-underscore, { letter | digit | "_" } ;
field-name    = letter-or-underscore, { letter | digit | "_" } ;
row-count     = digit, { digit } ;
indentation   = one-or-more-space-or-tab ;
whitespace    = { " " | "\t" } ;
```

This grammar is intentionally small. Nested blocks, inline comments, schema annotations, typed values,
and JSONPath-like block names are **NOT** part of this subset.

## Header Syntax

Each block **MUST** start with a header:

```toon
BlockName[rowCount]{field1,field2,...}:
```

- `BlockName` **MUST** match `^[A-Za-z_][A-Za-z0-9_]*$`.
- `rowCount` **MUST** be a non-negative base-10 integer.
- The field list **MUST** contain zero or more comma-separated field names.
- Each field name **MUST** match `^[A-Za-z_][A-Za-z0-9_]*$`.
- The trailing colon **MUST** mark the end of the header.
- Parsers **MUST** treat duplicate block names case-insensitively for diagnostics.
- Parsers **SHOULD** report duplicate field names in a block.

Field-list whitespace is tolerated by tools when parsing, but formatters **SHOULD** emit compact field lists without spaces:

```toon
users[2]{id,name}:
```

## Data Rows

Rows **MUST** be indented with one or more spaces or tabs and contain comma-separated values:

```toon
users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user
```

Rows are associated with the most recent preceding header. A non-comment, non-blank row before any header is malformed.

A row's number of values **SHOULD** match the number of declared fields. Tooling **MUST** surface a diagnostic when value count and field count differ.
Missing trailing fields in malformed rows are diagnostic errors; they are not silently synthesized by the parser.

The number of parsed data rows **SHOULD** match `rowCount`. Comments and blank lines **MUST NOT** count toward `rowCount`.

## Comments and Blank Lines

A comment line begins with optional whitespace followed by `#`:

```toon
# user records
users[1]{id,name}:
  # first row
  1,Alice
```

Comments **MAY** appear before blocks or inside block bodies. Comments inside a block are associated with that block until the next header.
Inline comments after values are **NOT** supported in this subset; a `#` character inside a row value is treated as data.

Blank lines **MAY** appear between blocks or inside block bodies. Blank lines **MUST NOT** terminate a block.

## Values

### Bare Values

Bare values are unquoted text segments delimited by commas or line endings. Leading and trailing whitespace around a bare segment is not semantically significant and **SHOULD** be trimmed by parsers.

```toon
users[1]{id,name}:
  1, Alice
```

In the example above, the parsed `name` value is `Alice`.

### Quoted Values

Double-quoted values **MAY** contain commas and leading or trailing spaces:

```toon
users[1]{id,name}:
  1,"Bob, Jr."
```

A double quote inside a quoted value **MUST** be escaped by doubling it:

```toon
quotes[1]{text}:
  "Says ""hello"""
```

A row containing an unterminated quoted value is malformed and **MUST** produce a parse diagnostic.

### Empty Values

Empty values are represented by consecutive commas, a leading comma, or a trailing comma:

```toon
users[3]{id,name,note}:
  1,Alice,
  2,,pending
  ,Unknown,missing id
```

The parser **MUST** preserve empty values as empty strings. `""` and an unquoted empty segment are semantically equivalent empty strings in this subset.
There is no distinct `null` literal.

## Type System

TOON values in this subset are strings. Numeric-looking values, booleans, and dates are parsed as strings unless a future schema layer explicitly defines typed conversion.

For JSON conversion, implementations **MAY** emit JSON objects and arrays, but they **MUST** document whether values are kept as strings or coerced. TOON Tools VSX keeps parsed TOON values as strings in its simple TOON-to-JSON conversion.

## Diagnostics

Tooling **SHOULD** report diagnostics for at least:

- malformed headers,
- rows before a header,
- duplicate block names,
- empty field names,
- duplicate field names,
- row-count mismatches,
- value-count mismatches,
- unterminated quoted values.

Diagnostics **SHOULD** include source ranges precise enough for editor highlighting and quick fixes.

## Formatting Rules

A formatter **SHOULD** emit:

- one header per block,
- compact field lists without spaces after commas,
- two-space row indentation by default,
- comments unchanged except for surrounding structural placement,
- exactly one blank line between adjacent blocks when formatting full documents.

A formatter **MUST NOT** change parsed values, block names, field names, or row order.

## Compatibility Decisions

The following are explicitly outside the current supported subset and **MUST** remain rejected or treated as plain data until a future spec revision changes them:

- nested block names such as `users[0]{id}.roles[0]{name}:`,
- indexed object paths such as `users[0]{id,name}:`,
- inline comments after row data,
- typed field annotations such as `age:int`,
- multiline quoted values,
- escaping other than doubled double-quotes inside quoted values,
- schema directives embedded in TOON files.

## Examples

```toon
users[3]{id,name,role}:
  1,Alice,admin
  2,Bob,user
  3,Charlie,user

projects[2]{id,title,owner}:
  p1,"TOON Tools",1
  p2,"Comma ""Safe"" Data",2
```

## Versioning

This document describes the TOON Tools VSX supported subset. Backward-incompatible grammar changes **SHOULD** be documented in the changelog and accompanied by migration guidance.
