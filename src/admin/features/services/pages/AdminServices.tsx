import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logActivity } from '../../../../shared/services/activityLogger';
import { AdminLayout } from '../../layout/components/AdminLayout';
import { ServiceModal } from '../components/ServiceModal';
import { CategoryModal } from '../components/CategoryModal';
import { ConfirmDeleteModal } from '../../../../shared/components/ConfirmDeleteModal';
import { getServicesAdmin, saveService, saveCategory, deleteService, deleteCategory } from '../../../services/services';
import type { SystemUser } from '../../../../shared/types/user';
import type { ServiceData } from '../../../../shared/types/service';
import '../../../styles/AdminServices.css';

interface AdminServicesProps {
  onLogout: () => void;
  systemUser?: SystemUser | null;
}

export const AdminServices: React.FC<AdminServicesProps> = ({ onLogout, systemUser }) => {
  const isBarber = systemUser?.role === 'barber';
  const [services, setServices] = useState<ServiceData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isServiceModalOpen, setIsServiceModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<ServiceData | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'service' | 'category'; id?: number; name?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch services from Supabase
  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getServicesAdmin();
      setServices(data);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Compute distinct categories and count per category
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    services.forEach((s) => {
      const cat = s.category_name || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [services]);

  const categoryList = useMemo(() => {
    return Object.keys(categoryStats);
  }, [categoryStats]);

  // Filter services based on category and search query
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesCategory = selectedCategory === 'All' || s.category_name === selectedCategory;
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  // Handlers for Service CRUD
  const handleSaveService = async (serviceData: ServiceData) => {
    setIsSubmitting(true);
    try {
      await saveService(serviceData);

      if (serviceData.id) {
        await logActivity('service_edit', 'service', `Updated service details for ${serviceData.name}`, systemUser?.username || 'Admin');
      } else {
        await logActivity('service_add', 'service', `Added new service: ${serviceData.name}`, systemUser?.username || 'Admin');
      }
      setIsServiceModalOpen(false);
      setEditingService(null);
      await fetchServices();
    } catch (err) {
      console.error('Error saving service:', err);
      alert('Failed to save service. Please check your network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers for Category CRUD
  const handleSaveCategory = async (newCategoryName: string) => {
    setIsSubmitting(true);
    try {
      await saveCategory(newCategoryName, editingCategoryName);

      if (editingCategoryName) {
        if (selectedCategory === editingCategoryName) {
          setSelectedCategory(newCategoryName);
        }
        await logActivity('service_edit', 'service', `Renamed service category from ${editingCategoryName} to ${newCategoryName}`, systemUser?.username || 'Admin');
      } else {
        setSelectedCategory(newCategoryName);
        await logActivity('service_add', 'service', `Created new service category: ${newCategoryName}`, systemUser?.username || 'Admin');
      }
      setIsCategoryModalOpen(false);
      setEditingCategoryName(null);
      await fetchServices();
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Failed to update category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      if (deleteTarget.type === 'service' && deleteTarget.id) {
        await deleteService(deleteTarget.id);
        await logActivity('service_delete', 'service', `Deleted service item`, systemUser?.username || 'Admin');
      } else if (deleteTarget.type === 'category' && deleteTarget.name) {
        await deleteCategory(deleteTarget.name);
        if (selectedCategory === deleteTarget.name) {
          setSelectedCategory('All');
        }
        await logActivity('service_delete', 'service', `Deleted category ${deleteTarget.name} and its services`, systemUser?.username || 'Admin');
      }
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      await fetchServices();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Failed to delete item.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <AdminLayout onLogout={onLogout} systemUser={systemUser} activeTab="services">
      <div className="services-page-container">
        {/* Left Category Sidebar */}
        <aside className="services-cat-sidebar">
          <div className="cat-sidebar-header">
            <h2>Services & classes</h2>
          </div>
          
          <div className="cat-group">
            <div 
              className={`cat-item-row ${selectedCategory === 'All' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('All')}
            >
              <span className="cat-name">Services ({services.length})</span>
            </div>

            <div className="cat-sub-list">
              {categoryList.map((catName) => (
                <div 
                  key={catName}
                  className={`cat-item-row sub ${selectedCategory === catName ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(catName)}
                >
                  <span className="cat-name">{catName} ({categoryStats[catName]})</span>
                  {!isBarber && (
                    <div className="cat-actions-inline" onClick={(e) => e.stopPropagation()}>
                      <button 
                        type="button" 
                        className="cat-action-btn" 
                        title="Edit Category"
                        onClick={() => {
                          setEditingCategoryName(catName);
                          setIsCategoryModalOpen(true);
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button 
                        type="button" 
                        className="cat-action-btn danger" 
                        title="Delete Category"
                        onClick={() => {
                          setDeleteTarget({ type: 'category', name: catName });
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!isBarber && (
              <button 
                type="button" 
                className="add-cat-btn" 
                onClick={() => {
                  setEditingCategoryName(null);
                  setIsCategoryModalOpen(true);
                }}
              >
                + New service category
              </button>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="services-main-panel">
          <div className="services-panel-header">
            <div className="header-left">
              <h1 className="services-panel-title">
                {selectedCategory === 'All' ? 'Services' : selectedCategory}
              </h1>
            </div>
            <div className="header-right">
              {!isBarber && (
                <button 
                  type="button" 
                  className="btn-add-appt" 
                  onClick={() => {
                    setEditingService(null);
                    setIsServiceModalOpen(true);
                  }}
                  title="Add Service"
                >
                  + Add Service
                </button>
              )}
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="services-toolbar">
            <div className="toolbar-search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input 
                type="text" 
                placeholder="Services" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Services Cards List */}
          <div className="services-list-viewport">
            {isLoading ? (
              <div className="grid-loading-overlay">Loading services...</div>
            ) : filteredServices.length === 0 ? (
              <div className="services-empty-state">
                <p>No services found in this category.</p>
                {!isBarber && (
                  <button 
                    type="button" 
                    className="btn-primary" 
                    style={{ marginTop: '12px' }}
                    onClick={() => {
                      setEditingService(null);
                      setIsServiceModalOpen(true);
                    }}
                  >
                    + Add Service
                  </button>
                )}
              </div>
            ) : (
              filteredServices.map((srv) => {
                return (
                  <div key={srv.id} className="service-row-card">
                    <div className="service-card-left-indicator" />
                    <div className="service-card-img">
                      {srv.image_url ? (
                        <img src={srv.image_url} alt={srv.name} />
                      ) : (
                        <div className="service-card-placeholder-img">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="service-card-info">
                      <h3 className="service-card-title">{srv.name}</h3>
                      <div className="service-card-meta">
                        <span>{srv.duration_minutes} mins</span>
                        <span className="dot-sep">•</span>
                        <span>₱{srv.price}</span>
                        {srv.description && (
                          <>
                            <span className="dot-sep">•</span>
                            <span className="service-desc-snippet">{srv.description}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {!isBarber && (
                      <div className="service-card-actions">
                        <button 
                          type="button" 
                          className="service-action-btn"
                          onClick={() => {
                            setEditingService(srv);
                            setIsServiceModalOpen(true);
                          }}
                          title="Edit service"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button 
                          type="button" 
                          className="service-action-btn danger"
                          onClick={() => {
                            setDeleteTarget({ type: 'service', id: srv.id, name: srv.name });
                            setIsDeleteModalOpen(true);
                          }}
                          title="Delete service"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </main>

        {/* Modals */}
        <ServiceModal
          isOpen={isServiceModalOpen}
          service={editingService}
          categories={categoryList}
          defaultCategory={selectedCategory === 'All' ? (categoryList[0] || 'Haircut') : selectedCategory}
          isSubmitting={isSubmitting}
          onSave={handleSaveService}
          onClose={() => setIsServiceModalOpen(false)}
        />

        <CategoryModal
          isOpen={isCategoryModalOpen}
          initialCategoryName={editingCategoryName || ''}
          isEditing={Boolean(editingCategoryName)}
          isSubmitting={isSubmitting}
          onSave={handleSaveCategory}
          onClose={() => setIsCategoryModalOpen(false)}
        />

        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          title={deleteTarget?.type === 'service' ? 'Delete service?' : 'Delete category?'}
          message={
            deleteTarget?.type === 'service'
              ? `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`
              : `Are you sure you want to delete category "${deleteTarget?.name}"? All services under this category will be permanently removed.`
          }
          isDeleting={isSubmitting}
          onConfirm={handleConfirmDelete}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      </div>
    </AdminLayout>
  );
};
