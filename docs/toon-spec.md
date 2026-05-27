# TOON Format Specification

TOON, Token-Oriented Object Notation, is a compact line-oriented representation for tabular data.
Files use UTF-8 text and the `.toon` extension.

## Grammar

```ebnf
document      = { blank-line | comment | block } ;
block         = header, { row | blank-line | comment } ;
header        = block-name, "[", row-count, "]", "{", [ field-list ], "}", ":" ;
field-list    = field-name, { ",", field-name } ;
row           = indentation, value, { ",", value } ;
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
```

## Header Syntax

Each block starts with a header:

```toon
BlockName[rowCount]{field1,field2,...}:
```

- `BlockName` identifies the table-like block.
- `rowCount` declares the expected number of data rows.
- The field list declares row columns in order.
- The trailing colon marks the start of the block body.

## Data Rows

Rows are indented and comma-separated:

```toon
users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user
```

The number of values should match the number of fields. Tooling reports a diagnostic when it does
not match.

## Comments

Lines beginning with optional whitespace followed by `#` are comments:

```toon
# user records
users[1]{id,name}:
  # first row
  1,Alice
```

Comments do not count toward the declared row count.

## Quoted Values

Double-quoted values may contain commas:

```toon
users[1]{id,name}:
  1,"Bob, Jr."
```

Escape a double quote by doubling it:

```toon
quotes[1]{text}:
  "Says ""hello"""
```

## Null and Empty Values

Empty values are represented by consecutive commas or a trailing comma:

```toon
users[2]{id,name,note}:
  1,Alice,
  2,,pending
```

The extension preserves empty values as empty strings during TOON parsing. Missing trailing fields
in malformed rows are surfaced by lint diagnostics.

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
