import React, { useState, useRef, useEffect } from 'react';
import { LogoutModal } from '../../auth/components/LogoutModal';
import type { CustomerUser } from '../../../../shared/types/user';
import '../../../styles/ClientHeader.css';

interface ClientHeaderProps {
  customerUser: CustomerUser | null;
  currentView: string;
  onNavigate: (hash: string) => void;
  onLogout: () => void;
  onShare: () => void;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({
  customerUser,
  currentView,
  onNavigate,
  onLogout,
  onShare,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    return ['services', 'team', 'about', 'address'].includes(hash) ? hash : 'services';
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentView !== 'booking') return;

    const sectionIds = ['services', 'team', 'about', 'address'];

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200; // Offset for header height and triggering threshold

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(sectionIds[i]);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentView]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const section = hash.replace('#', '');
    if (['services', 'team', 'about', 'address'].includes(section)) {
      setActiveSection(section);
    }
    onNavigate(hash);
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo-area">
          <a
            href="#services"
            className="logo-link"
            onClick={(e) => handleLinkClick(e, '#services')}
          >
            <img src="/images/logo.jpg" alt="Foundry Barber Studio Logo" className="logo-image" />
            <span className="logo-text">Foundry Barber Studio</span>
          </a>
        </div>

        <nav className={`nav-menu${mobileMenuOpen ? ' mobile-open' : ''}`}>
          <a
            href="#services"
            className={`nav-item${currentView === 'booking' && activeSection === 'services' ? ' active' : ''}`}
            onClick={(e) => handleLinkClick(e, '#services')}
          >
            Book Now
          </a>
          <a
            href="#team"
            className={`nav-item${currentView === 'booking' && activeSection === 'team' ? ' active' : ''}`}
            onClick={(e) => handleLinkClick(e, '#team')}
          >
            Team
          </a>
          <a
            href="#about"
            className={`nav-item${currentView === 'booking' && activeSection === 'about' ? ' active' : ''}`}
            onClick={(e) => handleLinkClick(e, '#about')}
          >
            About
          </a>
          <a
            href="#address"
            className={`nav-item${currentView === 'booking' && activeSection === 'address' ? ' active' : ''}`}
            onClick={(e) => handleLinkClick(e, '#address')}
          >
            Address
          </a>
          <a
            href="#/track"
            className={`nav-item${currentView === 'tracker' ? ' active' : ''}`}
            onClick={(e) => handleLinkClick(e, '#/track')}
          >
            Track Booking
          </a>
        </nav>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="tel:09943543318" className="action-phone">
            <i className="bi bi-telephone"></i> <span className="phone-text">0994 354 3318</span>
          </a>
          <button type="button" id="btnShare" className="btn-icon" onClick={onShare} title="Share booking link">
            <i className="bi bi-share"></i>
          </button>

          <button
            type="button"
            className="btn-icon nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title="Toggle Menu"
            aria-label="Toggle navigation menu"
          >
            <i className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
          </button>

          {customerUser ? (
            <div className="profile-dropdown-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn-icon profile-trigger-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title="Customer Profile"
                aria-label="User menu"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary, #ffffff)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                  <path
                    fillRule="evenodd"
                    d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"
                  />
                </svg>
              </button>

              {dropdownOpen && (
                <div
                  className="profile-dropdown-menu"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '48px',
                    backgroundColor: '#16161a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                    minWidth: '160px',
                    zIndex: 1000,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>{customerUser.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {customerUser.email || customerUser.phone}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onNavigate('#/profile');
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: 'none',
                      border: 'none',
                      color: '#e0e0e0',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <i className="bi bi-person"></i> Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setShowLogoutModal(true);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: 'none',
                      border: 'none',
                      color: '#ff4d4f',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,77,79,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <i className="bi bi-box-arrow-right"></i> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('#/login')}
              style={{
                padding: '8px 20px',
                fontSize: '0.9rem',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                color: '#0e0e10',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e5')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              Login
            </button>
          )}
        </div>
      </div>
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          onLogout();
        }}
      />
    </header>
  );
};
