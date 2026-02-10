import { useState, useEffect } from 'react';
import type { Section } from '../types';

interface SectionModalProps {
  section: Section | null;
  onSave: (section: Section) => void;
  onDelete: (sectionId: string) => void;
  onClose: () => void;
  isNew?: boolean;
}

// Initio Learning Trust brand-inspired colors
const PRESET_COLORS = [
  { color: '#2d3e50', bgColor: '#e8edf2', name: 'Navy' },
  { color: '#7ecec0', bgColor: '#e6f7f5', name: 'Mint' },
  { color: '#f5c344', bgColor: '#fef9e7', name: 'Yellow' },
  { color: '#f08a7a', bgColor: '#fef0ee', name: 'Coral' },
  { color: '#9eb8c7', bgColor: '#f0f5f8', name: 'Slate' },
  { color: '#2e7d32', bgColor: '#e8f5e9', name: 'Green' },
  { color: '#6a1b9a', bgColor: '#f3e5f5', name: 'Purple' },
  { color: '#e65100', bgColor: '#fff3e0', name: 'Orange' },
  { color: '#616161', bgColor: '#f5f5f5', name: 'Grey' },
];

export function SectionModal({
  section,
  onSave,
  onDelete,
  onClose,
  isNew = false,
}: SectionModalProps) {
  const [formData, setFormData] = useState<Section>({
    id: '',
    name: '',
    color: PRESET_COLORS[0].color,
    bgColor: PRESET_COLORS[0].bgColor,
    collapsed: false,
    type: 'primary',
  });

  useEffect(() => {
    if (section) {
      setFormData({ ...section, type: section.type || 'primary' });
    } else {
      setFormData({
        id: `section-${crypto.randomUUID().slice(0, 8)}`,
        name: '',
        color: PRESET_COLORS[0].color,
        bgColor: PRESET_COLORS[0].bgColor,
        collapsed: false,
        type: 'primary',
      });
    }
  }, [section]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: isNew ? `${formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${formData.id.split('-').pop()}` : formData.id,
    });
  };

  const handleColorSelect = (preset: (typeof PRESET_COLORS)[0]) => {
    setFormData((prev) => ({
      ...prev,
      color: preset.color,
      bgColor: preset.bgColor,
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isNew ? 'Add New Section' : 'Edit Section'}</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Section Name</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Teaching Staff"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Section Type</label>
            <select
              id="type"
              value={formData.type || 'primary'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  type: e.target.value as 'primary' | 'secondary' | 'support',
                }))
              }
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="support">Support</option>
            </select>
          </div>

          <div className="form-group">
            <label>Color Scheme</label>
            <div className="color-presets">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  className={`color-preset ${formData.color === preset.color ? 'selected' : ''}`}
                  style={{
                    backgroundColor: preset.bgColor,
                    borderColor: preset.color,
                  }}
                  onClick={() => handleColorSelect(preset)}
                  title={preset.name}
                >
                  <span style={{ color: preset.color }}>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Preview</label>
            <div
              className="section-preview"
              style={{
                backgroundColor: formData.bgColor,
                borderColor: formData.color,
                borderWidth: 2,
                borderStyle: 'solid',
                borderRadius: 8,
                padding: '12px 16px',
              }}
            >
              <div
                style={{
                  backgroundColor: formData.color,
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {formData.name || 'Section Name'}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            {!isNew && section?.id !== 'secondary-roles' && (
              <button
                type="button"
                className="delete-btn"
                onClick={() => {
                  if (confirm('Are you sure? All groups in this section will also be deleted.')) {
                    onDelete(formData.id);
                  }
                }}
              >
                Delete Section
              </button>
            )}
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              {isNew ? 'Add Section' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
