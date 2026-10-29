/** Load of an engineer by the projects they carry: 0-1 light, 2-3 moderate, more than 3 overloaded. */
export function workloadLevel(count: number): { label: string; className: string } {
  if (count <= 1) return { label: 'Light load', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (count <= 3) return { label: 'Moderate load', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Overloaded', className: 'bg-rose-50 text-rose-700 border-rose-200' };
}
