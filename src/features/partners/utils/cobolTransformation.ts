/**
 * Reads a COBOL program and the Java the converter generated from it, and lines the two up:
 * which data item became which Java field, which paragraph became which method, and how the
 * statements were translated. Everything is derived from the real text - nothing is invented
 * when a name cannot be matched, the Java side is simply left empty.
 */

export interface DataItemMapping {
  level: string;
  cobolName: string;
  picture?: string;
  usage?: string;
  value?: string;
  /** Java type inferred from the PICTURE clause, used when no real declaration is found. */
  inferredType: string;
  /** The real `private ... name;` declaration found in the generated Java, if any. */
  javaDeclaration?: string;
}

export interface ParagraphMapping {
  cobolName: string;
  javaMethod?: string;
}

export interface StatementMapping {
  cobol: string;
  java: string;
  count: number;
  example: string;
}

export interface CobolTransformation {
  dataItems: DataItemMapping[];
  paragraphs: ParagraphMapping[];
  statements: StatementMapping[];
}

const NON_PARAGRAPH_WORDS = new Set(['EXIT', 'GOBACK', 'CONTINUE', 'DECLARATIVES', 'END-IF', 'END-PERFORM']);

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Drops the sequence area and skips comment lines of a fixed-format COBOL line. */
function codeOf(line: string): string | null {
  const fixed = /^[\d\s]{6}[ *\/\-D]/.test(line);
  const body = fixed ? line.slice(6) : line;
  const indicator = body.charAt(0);
  if (indicator === '*' || indicator === '/') return null;
  return (fixed ? body.slice(1) : body).replace(/\s+$/, '');
}

/** Joins source lines into period-terminated statements, split into the data and the procedure part. */
function splitStatements(source: string): { data: string[]; procedure: string[] } {
  const data: string[] = [];
  const procedure: string[] = [];
  let inProcedure = false;
  let pending = '';
  for (const rawLine of source.split(/\r?\n/)) {
    const code = codeOf(rawLine);
    if (code === null || code.trim() === '') continue;
    pending = pending ? `${pending} ${code.trim()}` : code.trim();
    if (!pending.endsWith('.')) continue;
    const statement = pending;
    pending = '';
    if (/^PROCEDURE\s+DIVISION\b/i.test(statement)) {
      inProcedure = true;
      continue;
    }
    (inProcedure ? procedure : data).push(statement);
  }
  if (pending) (inProcedure ? procedure : data).push(pending);
  return { data, procedure };
}

function inferJavaType(picture: string | undefined, usage: string | undefined): string {
  if (!picture) return 'inner class (group item)';
  if (usage && /COMP|BINARY|PACKED/i.test(usage)) return 'Record / int';
  const pic = picture.toUpperCase();
  if (/^[AX]/.test(pic.replace(/^S/, '')) || /[AX]/.test(pic)) return 'String';
  const expanded = pic.replace(/9\((\d+)\)/g, (_m, n: string) => '9'.repeat(Number(n)));
  const digits = (expanded.match(/9/g) ?? []).length;
  if (/[V.]/.test(expanded)) return 'BigDecimal';
  return digits <= 9 ? 'int' : digits <= 18 ? 'long' : 'BigDecimal';
}

/** `private <type> <name>;` declarations of the generated Java, keyed by normalised name. */
function javaFields(javaCode: string): Map<string, string> {
  const fields = new Map<string, string>();
  const pattern = /^\s*private\s+([\w<>\[\], .]+?)\s+(\w+)\s*(?:=[^;]*)?;/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(javaCode)) !== null) {
    const key = normalizeName(match[2]);
    if (!fields.has(key)) fields.set(key, `private ${match[1]} ${match[2]};`);
  }
  return fields;
}

function javaMethods(javaCode: string): Map<string, string> {
  const methods = new Map<string, string>();
  const pattern = /(?:public|private|protected)\s+(?:static\s+)?[\w<>\[\]]+\s+(\w+)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(javaCode)) !== null) {
    const key = normalizeName(match[1]);
    if (!methods.has(key)) methods.set(key, `${match[1]}()`);
  }
  return methods;
}

function parseDataItems(statements: string[], fields: Map<string, string>): DataItemMapping[] {
  const items: DataItemMapping[] = [];
  for (const statement of statements) {
    const head = /^(\d{1,2})\s+([A-Z0-9][A-Z0-9-]*)\b(.*?)\.?$/i.exec(statement);
    if (!head) continue;
    const level = head[1].padStart(2, '0');
    const name = head[2].toUpperCase();
    if (name === 'FILLER' || level === '88' || level === '66' || level === '78') continue;
    if (level !== '77' && Number(level) > 49) continue;
    const clauses = head[3];
    const picture = /\bPIC(?:TURE)?\s+(?:IS\s+)?([^\s]+?)(?=\s|\.?$)/i.exec(clauses)?.[1]?.replace(/\.$/, '');
    const usage = /\b(COMP(?:UTATIONAL)?(?:-[0-5])?|BINARY|PACKED-DECIMAL)\b/i.exec(clauses)?.[1];
    const value = /\bVALUE\s+(?:IS\s+)?('[^']*'|"[^"]*"|[^\s]+)/i.exec(clauses)?.[1]?.replace(/\.$/, '');
    items.push({
      level,
      cobolName: name,
      picture,
      usage,
      value,
      inferredType: inferJavaType(picture, usage),
      javaDeclaration: fields.get(normalizeName(name)),
    });
  }
  return items;
}

function parseParagraphs(statements: string[], methods: Map<string, string>): ParagraphMapping[] {
  const paragraphs: ParagraphMapping[] = [];
  for (const statement of statements) {
    const match = /^([A-Z0-9][A-Z0-9-]*)\.$/i.exec(statement);
    if (!match || NON_PARAGRAPH_WORDS.has(match[1].toUpperCase())) continue;
    paragraphs.push({ cobolName: match[1].toUpperCase(), javaMethod: methods.get(normalizeName(match[1])) });
  }
  return paragraphs;
}

const STATEMENT_RULES: { cobol: string; pattern: RegExp; java: string }[] = [
  {
    cobol: 'DISPLAY ... UPON CONSOLE',
    pattern: /\bDISPLAY\b[^.]*?\bUPON\s+CONSOLE\b/gi,
    java: 'Console.println(...)',
  },
  {
    cobol: 'DISPLAY',
    pattern: /\bDISPLAY\b(?![^.]*?\bUPON\s+CONSOLE\b)/gi,
    java: 'Console.println(...)',
  },
  {
    cobol: 'PERFORM paragraph THRU paragraph',
    pattern: /\bPERFORM\s+[A-Z0-9-]+\s+(?:THRU|THROUGH)\s+[A-Z0-9-]+/gi,
    java: 'each paragraph in the range is called in order as a method call',
  },
  {
    cobol: 'PERFORM ... UNTIL',
    pattern: /\bPERFORM\b[^.]*?\bUNTIL\b/gi,
    java: 'while loop',
  },
  {
    cobol: 'PERFORM ... VARYING',
    pattern: /\bPERFORM\b[^.]*?\bVARYING\b/gi,
    java: 'for loop',
  },
  {
    cobol: 'PERFORM paragraph',
    pattern: /\bPERFORM\s+(?!UNTIL\b|VARYING\b|WITH\b|\d)[A-Z0-9-]+(?![A-Z0-9-])(?!\s+(?:THRU|THROUGH|UNTIL|VARYING|\d+\s+TIMES))/gi,
    java: 'method call',
  },
  { cobol: 'MOVE ... TO', pattern: /\bMOVE\b/gi, java: 'model.setX(value)' },
  { cobol: 'ADD / SUBTRACT / MULTIPLY / DIVIDE', pattern: /\b(?:ADD|SUBTRACT|MULTIPLY|DIVIDE)\b/gi, java: 'model.setX(expression)' },
  { cobol: 'COMPUTE', pattern: /\bCOMPUTE\b/gi, java: 'model.setX(expression)' },
  { cobol: 'IF', pattern: /\bIF\b/gi, java: 'if (Compare...(...))' },
  { cobol: 'EVALUATE', pattern: /\bEVALUATE\b/gi, java: 'if / else if chain' },
  { cobol: 'CALL', pattern: /\bCALL\b/gi, java: 'callProgram() through CallSupport' },
  { cobol: 'STOP RUN / GOBACK', pattern: /\b(?:STOP\s+RUN|GOBACK)\b/gi, java: 'return RepeatStatus.FINISHED' },
];

function parseStatements(procedure: string[]): StatementMapping[] {
  const text = procedure.join('\n');
  const mappings: StatementMapping[] = [];
  for (const rule of STATEMENT_RULES) {
    const matches = [...text.matchAll(rule.pattern)];
    if (matches.length === 0) continue;
    const first = matches[0];
    const start = first.index ?? 0;
    const end = text.indexOf('.', start);
    const example = text.slice(start, end === -1 ? undefined : end).replace(/\s+/g, ' ').trim();
    mappings.push({
      cobol: rule.cobol,
      java: rule.java,
      count: matches.length,
      example: example.length > 90 ? `${example.slice(0, 87)}...` : example,
    });
  }
  return mappings;
}

export function analyseCobolTransformation(cobolSource: string, javaCode: string): CobolTransformation {
  const { data, procedure } = splitStatements(cobolSource);
  return {
    dataItems: parseDataItems(data, javaFields(javaCode)),
    paragraphs: parseParagraphs(procedure, javaMethods(javaCode)),
    statements: parseStatements(procedure),
  };
}

export type CobolTokenKind = 'comment' | 'string' | 'number' | 'keyword' | 'plain';

const COBOL_KEYWORDS = new Set(
  (
    'IDENTIFICATION DIVISION PROGRAM-ID AUTHOR ENVIRONMENT CONFIGURATION INPUT-OUTPUT SECTION DATA WORKING-STORAGE ' +
    'FILE-CONTROL FILE LINKAGE PROCEDURE PIC PICTURE VALUE COMP COMP-3 COMP-5 BINARY USAGE OCCURS REDEFINES TIMES ' +
    'MOVE TO ADD SUBTRACT MULTIPLY DIVIDE COMPUTE GIVING FROM BY INTO IF ELSE END-IF EVALUATE WHEN OTHER END-EVALUATE ' +
    'PERFORM UNTIL VARYING THRU THROUGH DISPLAY UPON CONSOLE CALL USING STOP RUN GOBACK EXIT OPEN CLOSE READ WRITE ' +
    'INPUT OUTPUT NOT AND OR EQUAL GREATER LESS THAN IS ZERO ZEROS SPACE SPACES COPY'
  ).split(/\s+/),
);

/** Splits one COBOL line into coloured tokens (comment lines are a single comment token). */
export function tokenizeCobolLine(line: string): { kind: CobolTokenKind; text: string }[] {
  if (/^[\d\s]{6}[*\/]/.test(line) || /^\s*\*/.test(line)) return [{ kind: 'comment', text: line }];
  const tokens: { kind: CobolTokenKind; text: string }[] = [];
  const pattern = /('[^']*'|"[^"]*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z][A-Za-z0-9-]*)|(\s+|.)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line)) !== null) {
    if (match[1]) tokens.push({ kind: 'string', text: match[1] });
    else if (match[2]) tokens.push({ kind: 'number', text: match[2] });
    else if (match[3]) {
      tokens.push({ kind: COBOL_KEYWORDS.has(match[3].toUpperCase()) ? 'keyword' : 'plain', text: match[3] });
    } else tokens.push({ kind: 'plain', text: match[4] });
  }
  return tokens;
}
