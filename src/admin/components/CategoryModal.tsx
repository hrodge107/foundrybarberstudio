import React, { useState, useEffect } from 'react';

interface CategoryModalProps {
  isOpen: boolean;
  initialCategoryName?: string;
  isEditing?: boolean;
  isSubmitting?: boolean;
  onSave: (name: string) => void;
  onClose: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  initialCategoryName = '',
  isEditing = false,
  isSubmitting = false,
  onSave,
  onClose,
}) => {
  const [categoryName, setCategoryName] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setCategoryName(initialCategoryName);
      setError('');
    }
  }, [isOpen, initialCategoryName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = categoryName.trim();
    if (!trimmed) {
      setError('Category name cannot be empty');
      return;
    }
    onSave(trimmed);
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>{isEditing ? 'Edit service category' : 'New service category'}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="admin-modal-form">
          {error && <div className="admin-form-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="categoryNameInput">Category Name *</label>
            <input
              id="categoryNameInput"
              type="text"
              placeholder="e.g. Haircut, Shave & Beard"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="admin-modal-actions" style={{ padding: 0, background: 'transparent', borderTop: 'none' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save changes' : 'Create category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
