/** Data types a mapping rule may bind a legacy field to (same list as the backend). */
export const SUPPORT_PATCH_DATA_TYPES = ['string', 'number', 'integer', 'BigDecimal', 'boolean', 'date'] as const;
export type SupportPatchDataType = (typeof SUPPORT_PATCH_DATA_TYPES)[number];

export interface SupportPatchRule {
  sourceField: string;
  targetProperty: string;
  dataType: SupportPatchDataType;
  transformRule?: string;
}

export interface SupportPatchValidation {
  errors: string[];
  warnings: string[];
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const NUMERIC_TYPES: ReadonlySet<string> = new Set(['number', 'integer', 'BigDecimal']);
const STRING_ONLY_TRANSFORMS = /\b(toUpperCase|toLowerCase|capitalize\w*)\b/;

/**
 * Semantic checks run before a patch is applied. Errors block the patch, warnings flag likely
 * data loss. The backend runs the same rules again, so the server never trusts this result.
 */
export function validateSupportPatchRules(rules: SupportPatchRule[]): SupportPatchValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const typeByTarget = new Map<string, { type: string; row: number }>();
  const rowBySource = new Map<string, number>();

  rules.forEach((rule, index) => {
    const source = rule.sourceField.trim();
    const target = rule.targetProperty.trim();
    const transform = rule.transformRule?.trim() ?? '';
    const label = `Row ${index + 1}${source ? ` (${source})` : ''}`;

    if (!source) errors.push(`Row ${index + 1}: the legacy source field is required`);
    if (!target) errors.push(`${label}: the target property is required`);
    else if (!IDENTIFIER.test(target)) {
      errors.push(`${label}: "${target}" is not a valid property name (letters, digits, _ or $; no leading digit)`);
    }

    if (source) {
      const key = source.toUpperCase();
      const first = rowBySource.get(key);
      if (first !== undefined) errors.push(`${label}: source field is already mapped in row ${first + 1}`);
      else rowBySource.set(key, index);
    }

    if (target) {
      const previous = typeByTarget.get(target);
      if (previous && previous.type !== rule.dataType) {
        errors.push(`${label}: target "${target}" is ${rule.dataType} here but ${previous.type} in row ${previous.row + 1}`);
      } else if (!previous) {
        typeByTarget.set(target, { type: rule.dataType, row: index });
      }
    }

    if (transform) {
      if (rule.dataType === 'BigDecimal' && /\btoInt\b/.test(transform)) {
        warnings.push(`${label}: a toInt transform on BigDecimal drops the decimal places`);
      }
      if (NUMERIC_TYPES.has(rule.dataType) && STRING_ONLY_TRANSFORMS.test(transform)) {
        warnings.push(`${label}: "${transform}" is a text transform but the type is ${rule.dataType}`);
      }
      if (rule.dataType === 'string' && /\b(toCurrency|toInt|toNumber|parseFloat)\b/.test(transform)) {
        warnings.push(`${label}: "${transform}" produces a number but the type is string`);
      }
    }
  });

  return { errors, warnings };
}

export interface RuleChanges {
  added: number;
  edited: number;
  removed: number;
  total: number;
}

/** What a patch changes compared with the rules currently saved for the job. */
export function summarizeRuleChanges(saved: SupportPatchRule[], next: SupportPatchRule[]): RuleChanges {
  const key = (r: SupportPatchRule) => r.sourceField.trim().toUpperCase();
  const before = new Map(saved.map((r) => [key(r), r]));
  const after = new Map(next.map((r) => [key(r), r]));
  let added = 0;
  let edited = 0;
  for (const [field, rule] of after) {
    const old = before.get(field);
    if (!old) added += 1;
    else if (
      old.targetProperty !== rule.targetProperty.trim() ||
      old.dataType !== rule.dataType ||
      (old.transformRule ?? '') !== (rule.transformRule?.trim() ?? '')
    ) {
      edited += 1;
    }
  }
  let removed = 0;
  for (const field of before.keys()) if (!after.has(field)) removed += 1;
  return { added, edited, removed, total: added + edited + removed };
}
