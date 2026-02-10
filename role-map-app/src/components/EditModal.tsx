import { useState, useEffect } from 'react';
import type { RoleGroup, Section } from '../types';
import { Combobox, MultiCombobox } from './Combobox';

interface EditModalProps {
  group: RoleGroup | null;
  sections: Section[];
  allGroups: RoleGroup[];
  domain: string;
  onSave: (group: RoleGroup) => void;
  onDelete: (groupId: string) => void;
  onClose: () => void;
  isNew?: boolean;
}

export function EditModal({
  group,
  sections,
  allGroups,
  domain,
  onSave,
  onDelete,
  onClose,
  isNew = false,
}: EditModalProps) {
  const [formData, setFormData] = useState<RoleGroup>({
    id: '',
    email: '',
    label: '',
    parentId: null,
    sectionId: '',
    isSecondary: false,
    supplementsRoles: [],
  });

  useEffect(() => {
    if (group) {
      setFormData(group);
    } else {
      setFormData({
        id: `group-${crypto.randomUUID().slice(0, 8)}`,
        email: '',
        label: '',
        parentId: null,
        sectionId: sections[0]?.id || '',
        isSecondary: false,
        supplementsRoles: [],
      });
    }
  }, [group, sections]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailWithDomain = formData.email.includes('@')
      ? formData.email
      : `${formData.email}@${domain}`;
    onSave({ ...formData, email: emailWithDomain });
  };

  const handleEmailChange = (value: string) => {
    const emailPart = value.split('@')[0];
    setFormData((prev) => ({
      ...prev,
      email: emailPart,
      id: isNew ? `${emailPart.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${prev.id.split('-').pop()}` : prev.id,
    }));
  };

  const primaryGroups = allGroups.filter((g) => !g.isSecondary && g.id !== formData.id);
  const currentSection = sections.find((s) => s.id === formData.sectionId);
  const isSecondarySection = currentSection?.id === 'secondary-roles';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isNew ? 'Add New Role Group' : 'Edit Role Group'}</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="label">Display Name</label>
            <input
              id="label"
              type="text"
              value={formData.label}
              onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="e.g., Senior Leadership Team"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Prefix</label>
            <div className="email-input-wrapper">
              <input
                id="email"
                type="text"
                value={formData.email.split('@')[0]}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="e.g., slt"
                required
              />
              <span className="domain-suffix">@{domain}</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="section">Section</label>
            <select
              id="section"
              value={formData.sectionId}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sectionId: e.target.value,
                  isSecondary: e.target.value === 'secondary-roles',
                }))
              }
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          {!isSecondarySection && (
            <>
              <div className="form-group">
                <label>Parent Group (inherits access from)</label>
                <Combobox
                  options={primaryGroups.map((g) => ({
                    value: g.id,
                    label: `${g.label} (${g.email})`,
                  }))}
                  value={formData.parentId || ''}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      parentId: value || null,
                    }))
                  }
                  placeholder="Type to search or leave empty..."
                  allowCustom={false}
                />
              </div>

              {formData.parentId && (
                <div className="form-group">
                  <label htmlFor="edgeLabel">Connection Label (optional)</label>
                  <input
                    id="edgeLabel"
                    type="text"
                    value={formData.edgeLabel || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, edgeLabel: e.target.value }))
                    }
                    placeholder="e.g., 'reports to', 'member of'"
                  />
                </div>
              )}
            </>
          )}

          {isSecondarySection && (
            <div className="form-group">
              <label>Supplements Primary Roles</label>
              <MultiCombobox
                options={primaryGroups.map((g) => ({
                  value: g.id,
                  label: `${g.label} (${g.email})`,
                }))}
                values={formData.supplementsRoles || []}
                onChange={(values) =>
                  setFormData((prev) => ({
                    ...prev,
                    supplementsRoles: values,
                  }))
                }
                placeholder="Type to search and add roles..."
              />
            </div>
          )}

          <div className="modal-actions">
            {!isNew && (
              <button
                type="button"
                className="delete-btn"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this role group?')) {
                    onDelete(formData.id);
                  }
                }}
              >
                Delete
              </button>
            )}
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              {isNew ? 'Add Group' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
