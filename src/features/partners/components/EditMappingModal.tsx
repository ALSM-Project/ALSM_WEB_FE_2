import React, { useState } from 'react';
import { Modal, Button } from '@/shared/ui';
import { FieldMappingRule } from '../types/partner.types';
import { Plus, Trash2, ArrowRight } from 'lucide-react';

interface EditMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMappings: FieldMappingRule[];
  onSave: (mappings: FieldMappingRule[]) => Promise<void>;
  itemName: string;
}

export const EditMappingModal: React.FC<EditMappingModalProps> = ({
  isOpen,
  onClose,
  initialMappings,
  onSave,
  itemName,
}) => {
  const [mappings, setMappings] = useState<FieldMappingRule[]>(initialMappings);
  const [saving, setSaving] = useState(false);

  const handleFieldChange = (index: number, key: keyof FieldMappingRule, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [key]: value };
    setMappings(updated);
  };

  const handleAddRow = () => {
    setMappings([
      ...mappings,
      {
        id: `map-${Date.now()}`,
        sourceField: '',
        targetProperty: '',
        dataType: 'string',
        transformRule: '',
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setMappings(mappings.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(mappings);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Field Mappings: ${itemName}`}
    >
      <div className="space-y-4">
        <p className="text-xs text-[#6B778C]">
          Configure AST field extraction mappings. Adjust the target TypeScript property name, data type, and transformation rules.
        </p>

        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {mappings.map((mapping, index) => (
            <div
              key={mapping.id || index}
              className="p-3 rounded-lg border border-[#E5EAF0] bg-[#F7F9FC] space-y-2 text-xs"
            >
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <label className="block text-[11px] font-medium text-[#4A5568] mb-1">Source Field (BMS/COBOL)</label>
                  <input
                    type="text"
                    value={mapping.sourceField}
                    onChange={(e) => handleFieldChange(index, 'sourceField', e.target.value)}
                    placeholder="e.g. CUSTINP"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D9E2EC] rounded font-mono text-xs focus:ring-1 focus:ring-[#0652CC] outline-none"
                  />
                </div>
                <div className="col-span-1 flex justify-center items-end pb-1 text-[#6B778C]">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div className="col-span-6">
                  <label className="block text-[11px] font-medium text-[#4A5568] mb-1">Target Property</label>
                  <input
                    type="text"
                    value={mapping.targetProperty}
                    onChange={(e) => handleFieldChange(index, 'targetProperty', e.target.value)}
                    placeholder="e.g. customerId"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D9E2EC] rounded font-mono text-xs focus:ring-1 focus:ring-[#0652CC] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-[#E5EAF0]">
                <div className="col-span-4">
                  <label className="block text-[10px] text-[#6B778C]">Data Type</label>
                  <select
                    value={mapping.dataType}
                    onChange={(e) => handleFieldChange(index, 'dataType', e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-[#D9E2EC] rounded text-xs"
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="BigDecimal">BigDecimal (Java)</option>
                    <option value="LocalDate">LocalDate</option>
                  </select>
                </div>
                <div className="col-span-7">
                  <label className="block text-[10px] text-[#6B778C]">Transform Rule</label>
                  <input
                    type="text"
                    value={mapping.transformRule || ''}
                    onChange={(e) => handleFieldChange(index, 'transformRule', e.target.value)}
                    placeholder="e.g. trim().toUpperCase()"
                    className="w-full px-2 py-1 bg-white border border-[#D9E2EC] rounded text-xs font-mono"
                  />
                </div>
                <div className="col-span-1 flex justify-end items-end pb-0.5">
                  <button
                    onClick={() => handleRemoveRow(index)}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50"
                    title="Remove rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-[#0652CC] border-dashed border-[#0652CC]"
        >
          <Plus className="w-3.5 h-3.5" /> Add Mapping Rule
        </Button>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#E5EAF0]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={saving}>
            Save & Reconvert AST
          </Button>
        </div>
      </div>
    </Modal>
  );
};
