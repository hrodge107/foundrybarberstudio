import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../layout/components/AdminLayout';
import { getAdminProfileData, updateAdminCredentials, type BarberDetails } from '../../../services/profile';
import type { SystemUser } from '../../../../shared/types/user';

interface AdminProfileProps {
  onLogout: () => void;
  systemUser: SystemUser | null;
}

export const AdminProfile: React.FC<AdminProfileProps> = ({ onLogout, systemUser }) => {
  const [barberDetails, setBarberDetails] = useState<BarberDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Credentials State
  const [currentUsername, setCurrentUsername] = useState<string>(systemUser?.username || '');
  const [currentPassword, setCurrentPassword] = useState<string>('••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // In-Text Editing State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editUsername, setEditUsername] = useState<string>('');
  const [editPassword, setEditPassword] = useState<string>('');

  // Modal & Saving state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!systemUser) return;
      setIsLoading(true);
      
      try {
        const data = await getAdminProfileData(systemUser);
        setCurrentUsername(data.credentials.username);
        setCurrentPassword(data.credentials.password_hash);
        setBarberDetails(data.barberDetails);
      } catch (err) {
        console.error('Error loading profile info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [systemUser]);

  const workingDaysString = React.useMemo(() => {
    if (!barberDetails?.working_days) return 'None';
    if (Array.isArray(barberDetails.working_days)) {
      return barberDetails.working_days.join(', ');
    }
    return String(barberDetails.working_days);
  }, [barberDetails]);

  const handleStartEdit = () => {
    if (systemUser?.role !== 'admin') return;
    setEditUsername(currentUsername);
    setEditPassword(currentPassword.startsWith('••') ? '' : currentPassword);
    setErrorMsg(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrorMsg(null);
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim()) {
      setErrorMsg('Username cannot be empty.');
      return;
    }
    if (!editPassword.trim()) {
      setErrorMsg('Password cannot be empty.');
      return;
    }
    setErrorMsg(null);
    setIsConfirmModalOpen(true);
  };

  const handleSaveCredentials = async () => {
    if (!systemUser) return;
    setIsSaving(true);
    try {
      const trimmedUser = editUsername.trim();
      const trimmedPass = editPassword.trim();

      await updateAdminCredentials(systemUser.id, trimmedUser, trimmedPass);

      setCurrentUsername(trimmedUser);
      setCurrentPassword(trimmedPass);
      if (systemUser) {
        systemUser.username = trimmedUser;
      }

      setIsConfirmModalOpen(false);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to update credentials:', err);
      setErrorMsg('Failed to update credentials in database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout onLogout={onLogout} systemUser={systemUser} activeTab="profile">
      <div className="admin-profile-viewport">
        <header className="profile-top-bar">
          <h2>Account Profile</h2>
        </header>

        <div className="profile-content-container" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', alignItems: 'start' }}>
          {/* Main Account Credentials Card */}
          <div className="profile-card main-info-card" style={{ position: 'relative', paddingBottom: '20px' }}>
            <div className="profile-header-badge">
              <div className="avatar-placeholder">
                {(currentUsername || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="user-titles">
                <h3>{currentUsername || 'System User'}</h3>
                <span className={`role-badge ${systemUser?.role}`}>{systemUser?.role?.toUpperCase()}</span>
              </div>
            </div>

            {errorMsg && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#ef4444', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid #fca5a5' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleOpenConfirm}>
              <div className="profile-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="detail-item">
                  <label>Account ID</label>
                  <p>#{systemUser?.id || 'N/A'}</p>
                </div>

                <div className="detail-item">
                  <label>Username</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        marginTop: '4px',
                        color: '#1e293b',
                      }}
                      required
                    />
                  ) : (
                    <p>{currentUsername || 'N/A'}</p>
                  )}
                </div>

                <div className="detail-item">
                  <label>Password</label>
                  {isEditing ? (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="New password"
                        style={{
                          width: '100%',
                          padding: '8px 36px 8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
                          color: '#1e293b',
                        }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '8px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {showPassword ? (
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                          ) : (
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                          )}
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: '#334155' }}>
                        {showPassword ? currentPassword : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {showPassword ? (
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                          ) : (
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                          )}
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Right Edit / Action Buttons */}
              {systemUser?.role === 'admin' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      style={{
                        background: '#18181b',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'opacity 0.15s ease',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <span>Edit Profile Credentials</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        style={{
                          background: '#ffffff',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{
                          background: '#18181b',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 18px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Save Changes
                      </button>
                    </>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Barber Schedule Card (Status badge removed) */}
          {(systemUser?.role === 'barber' || barberDetails) && (
            <div className="profile-card shift-info-card">
              <h4>Barber Shift & Availability</h4>
              {isLoading ? (
                <p className="loading-txt">Loading schedule profile...</p>
              ) : barberDetails ? (
                <div className="profile-details-grid">
                  <div className="detail-item">
                    <label>Staff Name</label>
                    <p>{barberDetails.name}</p>
                  </div>
                  <div className="detail-item">
                    <label>Shift Hours</label>
                    <p>{barberDetails.shift_start} - {barberDetails.shift_end}</p>
                  </div>
                  <div className="detail-item">
                    <label>Active Working Days</label>
                    <p>{workingDaysString}</p>
                  </div>
                  <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                    <label>Description / Showcase Notes</label>
                    <p style={{ color: barberDetails.notes ? '#1e293b' : '#94a3b8', fontStyle: barberDetails.notes ? 'normal' : 'italic' }}>
                      {barberDetails.notes || 'No description or bio notes configured for team showcase.'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="empty-txt">No linked barber staff profile found in database.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsConfirmModalOpen(false)}>
          <div
            className="admin-modal-card"
            style={{
              maxWidth: '440px',
              borderRadius: '12px',
              background: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="admin-modal-header"
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Confirm Profile Updates</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsConfirmModalOpen(false)}
                aria-label="Close"
                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div className="admin-modal-body" style={{ padding: '24px' }}>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                Are you sure you want to update your system access credentials? You will use these new details for your next portal login.
              </p>
            </div>

            <div
              className="admin-modal-actions"
              style={{
                padding: '16px 24px',
                background: '#f8fafc',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                borderBottomLeftRadius: '12px',
                borderBottomRightRadius: '12px',
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSaving}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCredentials}
                disabled={isSaving}
                style={{
                  background: '#18181b',
                  borderColor: '#18181b',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                {isSaving ? 'Updating...' : 'Confirm Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
