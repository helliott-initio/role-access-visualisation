import { useState } from 'react';
import type { RoleMap } from '../types';

interface NewMapModalProps {
  onSave: (map: RoleMap) => void;
  onClose: () => void;
}

export function NewMapModal({ onSave, onClose }: NewMapModalProps) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${crypto.randomUUID().slice(0, 8)}`;
    const newMap: RoleMap = {
      id,
      name,
      domain: domain || 'example.org',
      rootGroupId: 'allstaff',
      sections: [
        {
          id: 'section-1',
          name: 'Section 1',
          color: '#2d3e50',
          bgColor: '#e8edf2',
          collapsed: false,
        },
        {
          id: 'secondary-roles',
          name: 'Secondary Roles',
          color: '#9eb8c7',
          bgColor: '#f0f5f8',
          collapsed: false,
        },
      ],
      groups: [
        {
          id: 'allstaff',
          email: `allstaff@${domain || 'example.org'}`,
          label: 'All Staff',
          parentId: null,
          sectionId: 'root',
        },
      ],
    };
    onSave(newMap);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Role Map</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="map-name">Map Name</label>
            <input
              id="map-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Secondary School"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="map-domain">Email Domain</label>
            <input
              id="map-domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., school.org"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              Create Map
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
