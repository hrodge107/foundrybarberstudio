import React, { useState, useEffect, useRef } from 'react';
import type { SystemUser } from '../../../../shared/types/user';
import { hasPermission } from '../../../../shared/rbac';
import '../../../styles/AdminLayout.css';
import '../../../styles/Global.css';

interface AdminLayoutProps {
  onLogout: () => void;
  systemUser?: SystemUser | null;
  activeTab?: 'calendar' | 'appointments' | 'services' | 'barbers' | 'customers' | 'activity' | 'reports' | 'profile' | 'settings';
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onLogout, systemUser, activeTab = 'calendar', children }) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const handleProfileClick = () => {
    setIsProfileMenuOpen(false);
    window.location.hash = '#/admin/profile';
  };

  const handleLogoutClick = () => {
    setIsProfileMenuOpen(false);
    onLogout();
    window.location.hash = '#/admin/login';
  };

  return (
    <div className="admin-app-layout">
      {/* Left Vertical Icon Navigation Rail */}
      <aside className="admin-sidebar-rail">
        <div className="rail-top">
          <div className="rail-logo-emblem" title="Foundry Barber Studio">
            <img src="/images/logo.jpg" alt="Foundry Barber Studio" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          </div>

          <nav className="rail-nav">
            <button 
              type="button" 
              className={`rail-icon-btn ${activeTab === 'calendar' ? 'active' : ''}`}
              title="Calendar"
              onClick={() => { window.location.hash = '#/admin/dashboard'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
            <button 
              type="button" 
              className={`rail-icon-btn ${activeTab === 'appointments' ? 'active' : ''}`}
              title="Appointments"
              onClick={() => { window.location.hash = '#/admin/appointments'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </button>
            <button 
              type="button" 
              className={`rail-icon-btn ${activeTab === 'services' ? 'active' : ''}`}
              title="Services"
              onClick={() => { window.location.hash = '#/admin/services'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <line x1="20" y1="4" x2="8.12" y2="15.88" />
                <line x1="14.47" y1="14.47" x2="20" y2="20" />
                <line x1="8.12" y1="8.12" x2="12" y2="12" />
              </svg>
            </button>
            <button 
              type="button" 
              className={`rail-icon-btn ${activeTab === 'barbers' ? 'active' : ''}`}
              title="Barbers"
              onClick={() => { window.location.hash = '#/admin/barbers'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </button>
            {hasPermission(systemUser?.role, 'customers') && (
              <button 
                type="button" 
                className={`rail-icon-btn ${activeTab === 'customers' ? 'active' : ''}`}
                title="Customers"
                onClick={() => { window.location.hash = '#/admin/customers'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <circle cx="12" cy="8" r="2" />
                  <path d="M15 13a3 3 0 0 0-6 0" />
                </svg>
              </button>
            )}
            {hasPermission(systemUser?.role, 'activity') && (
              <button 
                type="button" 
                className={`rail-icon-btn ${activeTab === 'activity' ? 'active' : ''}`}
                title="Activity Log"
                onClick={() => { window.location.hash = '#/admin/activity'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </button>
            )}
            {hasPermission(systemUser?.role, 'reports') && (
              <button 
                type="button" 
                className={`rail-icon-btn ${activeTab === 'reports' ? 'active' : ''}`}
                title="Reports Dashboard"
                onClick={() => { window.location.hash = '#/admin/reports'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </button>
            )}
            {hasPermission(systemUser?.role, 'settings') && (
              <button 
                type="button" 
                className={`rail-icon-btn ${activeTab === 'settings' ? 'active' : ''}`}
                title="Store Hours"
                onClick={() => { window.location.hash = '#/admin/settings'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </button>
            )}
          </nav>
        </div>

        <div className="rail-bottom" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: 'auto' }}>
          {/* Bottom-most SVG Profile Icon with Popover */}
          <div className="rail-profile-wrapper" ref={menuRef}>
            <button 
              type="button" 
              className={`rail-icon-btn profile-rail-btn ${activeTab === 'profile' ? 'active' : ''}`}
              title="Admin Profile & Account"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            {isProfileMenuOpen && (
              <div className="rail-profile-popover">
                <button type="button" className="popover-item" onClick={handleProfileClick}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Profile</span>
                </button>
                <button type="button" className="popover-item danger" onClick={handleLogoutClick}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main-viewport">
        {children}
      </div>
    </div>
  );
};

