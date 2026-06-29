import React, { useState, useEffect } from 'react';

export interface ServiceData {
  id?: number;
  name: string;
  duration_minutes: number;
  price: number;
  description: string;
  image_url: string;
  category_name: string;
}

interface ServiceModalProps {
  isOpen: boolean;
  service?: ServiceData | null;
  categories: string[];
  defaultCategory?: string;
  isSubmitting?: boolean;
  onSave: (service: ServiceData) => void;
  onClose: () => void;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  service,
  categories,
  defaultCategory = 'Haircut',
  isSubmitting = false,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [price, setPrice] = useState<number>(200);
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (service) {
        setName(service.name || '');
        setDurationMinutes(service.duration_minutes || 30);
        setPrice(service.price || 0);
        setDescription(service.description || '');
        setImageUrl(service.image_url || '');
        setCategoryName(service.category_name || defaultCategory);
      } else {
        setName('');
        setDurationMinutes(30);
        setPrice(200);
        setDescription('');
        setImageUrl('');
        setCategoryName(defaultCategory || (categories.length > 0 ? categories[0] : 'Haircut'));
      }
      setError('');
    }
  }, [isOpen, service, defaultCategory, categories]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      setError('Image file size must be under 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Service title is required');
      return;
    }
    if (durationMinutes <= 0) {
      setError('Duration must be greater than 0 minutes');
      return;
    }
    if (price < 0 || price > 9999) {
      setError('Cost must be between ₱0 and ₱9,999');
      return;
    }
    if (!categoryName.trim()) {
      setError('Category is required');
      return;
    }

    onSave({
      id: service?.id,
      name: name.trim(),
      duration_minutes: Number(durationMinutes),
      price: Number(price),
      description: description.trim(),
      image_url: imageUrl,
      category_name: categoryName.trim(),
    });
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-card" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>{service ? 'Edit service' : 'Add service'}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="admin-modal-form">
          {error && <div className="admin-form-error">{error}</div>}

          {/* Service details section */}
          <div className="service-details-section">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a' }}>Service details</h4>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
              <div className="service-img-preview-box">
                {imageUrl ? (
                  <img src={imageUrl} alt="Service preview" className="service-img-thumb" />
                ) : (
                  <div className="service-img-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Service image</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Up to 1 MB in size</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <label className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                  {imageUrl && (
                    <button 
                      type="button" 
                      className="btn-icon" 
                      style={{ width: '28px', height: '28px', color: '#ef4444', borderColor: '#fecaca' }} 
                      onClick={() => setImageUrl('')}
                      title="Remove image"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="serviceTitleInput">Title *</label>
              <input
                id="serviceTitleInput"
                type="text"
                placeholder="e.g. Standard Grooming Package"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="serviceDescInput">Description</label>
              <textarea
                id="serviceDescInput"
                placeholder="Describe your service to Booking Page visitors"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{
                  padding: '10px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            <div className="form-group-row" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label htmlFor="serviceDurationInput">Duration (mins) *</label>
                <input
                  id="serviceDurationInput"
                  type="number"
                  min="5"
                  step="5"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="servicePriceInput">Cost (₱) *</label>
                <input
                  id="servicePriceInput"
                  type="number"
                  min="0"
                  max="9999"
                  step="10"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="serviceCategorySelect">Category *</label>
              <select
                id="serviceCategorySelect"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              >
                {categories.length === 0 ? (
                  <option value="Haircut">Haircut</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="admin-modal-actions" style={{ padding: '16px 0 0 0', background: 'transparent', borderTop: '1px solid #f1f5f9', marginTop: '12px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : service ? 'Save changes' : 'Add service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
