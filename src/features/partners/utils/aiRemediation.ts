import type { ValidationFinding } from '../types/validation';

/**
 * Extracts clean JSX or code snippet from an AI validation suggestion string.
 * Strips advisory prefixes like "Update to:", "Add:", "Replace with:" or markdown code blocks.
 */
export function extractSuggestionCode(suggestion: string): string {
  if (!suggestion) return '';

  // 1. Markdown code block ```tsx ... ``` or ``` ... ```
  const codeBlockMatch = suggestion.match(/```(?:tsx|jsx|html|typescript)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 2. Inline code backticks `...` if it contains code/JSX
  const inlineMatch = suggestion.match(/`([^`]+)`/);
  if (inlineMatch && (inlineMatch[1].includes('<') || inlineMatch[1].includes('{') || inlineMatch[1].includes('='))) {
    return inlineMatch[1].trim();
  }

  // 3. Strip common advisory prefixes
  return suggestion
    .replace(/^(?:Update to|Replace with|Add(?: missing field)?|Change to|Remediation|Fix):\s*/i, '')
    .trim();
}

/**
 * Applies an AI suggestion to the given TSX component code.
 * Intelligently replaces lines at targetLocation, or finds matching field by name,
 * or inserts new elements into the JSX container.
 */
export function applyAiSuggestion(code: string, finding: ValidationFinding): string {
  if (!code || !finding.suggestion) return code;

  const snippet = extractSuggestionCode(finding.suggestion);
  if (!snippet) return code;

  const lines = code.split('\n');

  // Strategy 1: Target Location line numbers if valid
  if (
    finding.targetLocation?.startLine &&
    finding.targetLocation.startLine > 0 &&
    finding.targetLocation.startLine <= lines.length
  ) {
    const start = finding.targetLocation.startLine - 1;
    const end =
      finding.targetLocation.endLine &&
      finding.targetLocation.endLine >= finding.targetLocation.startLine &&
      finding.targetLocation.endLine <= lines.length
        ? finding.targetLocation.endLine - 1
        : start;

    const originalLine = lines[start];
    const indentMatch = originalLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '      ';

    const snippetLines = snippet.split('\n').map((l, i) => (i === 0 ? indent + l.trim() : indent + l));
    lines.splice(start, end - start + 1, ...snippetLines);
    return lines.join('\n');
  }

  // Strategy 2: Match by fieldName if present (e.g. id="acctno" or name="ACCTNO")
  if (finding.title || finding.explanation) {
    const fieldMatch = (finding.title + ' ' + finding.explanation).match(/\b([A-Z0-9_-]{3,16})\b/);
    const candidateName = fieldMatch ? fieldMatch[1] : null;

    if (candidateName) {
      const lower = candidateName.toLowerCase();
      const matchIndex = lines.findIndex(
        (l) =>
          l.toLowerCase().includes(`id="${lower}"`) ||
          l.toLowerCase().includes(`id='${lower}'`) ||
          l.toLowerCase().includes(`name="${candidateName.toLowerCase()}"`) ||
          l.toLowerCase().includes(`"${candidateName}"`) ||
          l.includes(candidateName)
      );

      if (matchIndex >= 0) {
        const indentMatch = lines[matchIndex].match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '      ';
        const snippetLines = snippet.split('\n').map((l, i) => (i === 0 ? indent + l.trim() : indent + l));
        lines.splice(matchIndex, 1, ...snippetLines);
        return lines.join('\n');
      }
    }
  }

  // Strategy 3: Insert before the closing container </div> or </form>
  const closingDivRegex = /<\/div>\s*\n\s*\);\s*\n\s*};?\s*$/;
  if (closingDivRegex.test(code)) {
    const indent = '      ';
    const indentedSnippet = snippet
      .split('\n')
      .map((l) => indent + l.trim())
      .join('\n');
    return code.replace(closingDivRegex, `${indentedSnippet}\n    </div>\n  );\n};`);
  }

  const lastDivIdx = code.lastIndexOf('</div>');
  if (lastDivIdx >= 0) {
    const indent = '      ';
    const indentedSnippet = snippet
      .split('\n')
      .map((l) => indent + l.trim())
      .join('\n');
    return code.slice(0, lastDivIdx) + indentedSnippet + '\n    ' + code.slice(lastDivIdx);
  }

  return code + '\n' + snippet;
}
