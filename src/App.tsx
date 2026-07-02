import { useState, useEffect } from 'react';
import { BookingWizard } from './client/features/booking/components/BookingWizard';
import { BookingTracker } from './client/features/tracker/components/BookingTracker';
import { TeamShowcase } from './client/features/booking/components/TeamShowcase';
import { ClientHeader } from './client/features/booking/components/ClientHeader';
import { CustomerLogin } from './client/features/auth/pages/CustomerLogin';
import { CustomerSignup } from './client/features/auth/pages/CustomerSignup';
import { CustomerProfile } from './client/features/profile/pages/CustomerProfile';
import { AdminLogin } from './admin/features/auth/pages/AdminLogin';
import { AdminDashboard } from './admin/features/dashboard/pages/AdminDashboard';
import { AdminAppointments } from './admin/features/appointments/pages/AdminAppointments';
import { AdminServices } from './admin/features/services/pages/AdminServices';
import { AdminBarbers } from './admin/features/barbers/pages/AdminBarbers';
import { AdminCustomers } from './admin/features/customers/pages/AdminCustomers';
import { AdminProfile } from './admin/features/settings/pages/AdminProfile';
import { AdminActivityLog } from './admin/features/activity/pages/AdminActivityLog';
import { AdminReports } from './admin/features/reports/pages/AdminReports';
import { AdminStoreHours } from './admin/features/settings/pages/AdminStoreHours';
import { getServices, getBarbers, getStoreHours, saveAppointment as clientSaveAppointment } from './client/services/booking';
import type { SystemUser, CustomerUser } from './shared/types/user';
import { hasPermission } from './shared/rbac';
import type { Service } from './shared/types/service';
import type { Barber } from './shared/types/barber';
import type { StoreHour } from './shared/types/store';
import './client/styles/Home.css';
import './client/styles/Global.css';


type ViewType =
  | 'booking'
  | 'tracker'
  | 'customer-login'
  | 'customer-signup'
  | 'customer-profile'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-appointments'
  | 'admin-services'
  | 'admin-barbers'
  | 'admin-customers'
  | 'admin-activity'
  | 'admin-reports'
  | 'admin-profile'
  | 'admin-store-hours';

function App() {
  const [view, setView] = useState<ViewType>('booking');
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [storeHours, setStoreHours] = useState<StoreHour[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [systemUser, setSystemUser] = useState<SystemUser | null>(() => {
    const stored = sessionStorage.getItem('fbs_system_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    if (sessionStorage.getItem('fbs_admin_auth') === 'true') {
      return { id: 1, username: 'admin', role: 'admin' };
    }
    return null;
  });

  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(() => {
    const stored = sessionStorage.getItem('fbs_customer_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const handleAdminLoginSuccess = (user: SystemUser) => {
    setSystemUser(user);
    sessionStorage.setItem('fbs_system_user', JSON.stringify(user));
  };

  const handleAdminLogout = () => {
    setSystemUser(null);
    sessionStorage.removeItem('fbs_system_user');
    sessionStorage.removeItem('fbs_admin_auth');
  };

  const handleCustomerLoginSuccess = (user: CustomerUser) => {
    setCustomerUser(user);
    sessionStorage.setItem('fbs_customer_user', JSON.stringify(user));
    window.location.hash = '#/profile';
    setView('customer-profile');
  };

  const handleUpdateCustomerUser = (updatedUser: CustomerUser) => {
    setCustomerUser(updatedUser);
    sessionStorage.setItem('fbs_customer_user', JSON.stringify(updatedUser));
  };

  const handleCustomerLogout = () => {
    setCustomerUser(null);
    sessionStorage.removeItem('fbs_customer_user');
    window.location.hash = '#/login';
    window.location.reload();
  };

  // Parse location hash on mount and change with RBAC guards
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;

      if (hash === '#/admin/login') {
        if (systemUser) {
          window.location.hash = '#/admin/dashboard';
          setView('admin-dashboard');
        } else {
          setView('admin-login');
        }
      } else if (hash === '#/admin/appointments') {
        if (!systemUser) {
          window.location.hash = '#/admin/login';
          setView('admin-login');
        } else if (!hasPermission(systemUser.role, 'appointments')) {
          window.location.hash = '#/admin/dashboard';
          setView('admin-dashboard');
        } else {
          setView('admin-appointments');
        }
      } else if (hash === '#/admin/services') {
        if (!systemUser) {
          window.location.hash = '#/admin/login';
          setView('admin-login');
        } else {
          setView('admin-services');
        }
      } else if (hash === '#/admin/barbers') {
        if (!systemUser) {
          window.location.hash = '#/admin/login';
          setView('admin-login');
        } else {
          setView('admin-barbers');
        }
      } else if (hash === '#/admin/customers') {
        if (!systemUser) {
          window.location.hash = '#/admin/login';
          setView('admin-login');
        } else if (!hasPermission(systemUser.role, 'customers')) {
          window.location.hash = '#/admin/dashboard';
          setView('admin-dashboard');
        } else {
          setView('admin-customers');
        }
      } else if (hash === '#/admin/activity') {
        if (!systemUser) {
          window.location.hash = '#/admin/login';
          setView('admin-login');
        } else if (!hasPermission(systemUser.role, 'activity')) {
          window.location.hash = '#/admin/dashboard';
          setView('admin-dashboard');
        } else {
          setView('admin-activity');
        }
      } else if (hash === '#/admin/reports') {
        if (!systemUser) {
          window.location.hash = '#/admin/login';
          setView('admin-login');
        } else if (!hasPermission(systemUser.role, 'reports')) {
          window.location.hash = '#/admin/dashboard';
          setView('admin-dashboard');
        } else {
          setView('admin-reports');
        }
      } else if (hash === '#/admin/settings') {
        if (!systemUser) {
          window.location.hash = '#/admin/login';
          setView('admin-login');
        } else if (!hasPermission(systemUser.role, 'settings')) {
          window.location.hash = '#/admin/dashboard';
          setView('admin-dashboard');
        } else {
          setView('admin-store-hours');
        }
      } else if (hash === '#/admin/profile') {
        if (!systemUser) {
          window.location.hash = '#/admin/login';
          setView('admin-login');
        } else {
          setView('admin-profile');
        }
      } else if (hash === '#/admin' || hash === '#/admin/dashboard' || hash.startsWith('#/admin/')) {
        if (!systemUser) {
          window.location.hash = '#/admin/login';
          setView('admin-login');
        } else {
          setView('admin-dashboard');
        }
      } else if (hash === '#/login' || hash === '#login') {
        if (customerUser) {
          window.location.hash = '#/profile';
          setView('customer-profile');
        } else {
          setView('customer-login');
        }
      } else if (hash === '#/signup' || hash === '#signup') {
        if (customerUser) {
          window.location.hash = '#/profile';
          setView('customer-profile');
        } else {
          setView('customer-signup');
        }
      } else if (hash === '#/profile' || hash === '#profile') {
        if (!customerUser) {
          window.location.hash = '#/login';
          setView('customer-login');
        } else {
          setView('customer-profile');
        }
      } else if (hash.startsWith('#/track') || hash === '#track') {
        setView('tracker');
      } else {
        setView('booking');

        const targetId = hash.replace('#', '');
        if (targetId && targetId !== '/track' && targetId !== '/login' && targetId !== '/signup' && targetId !== '/profile') {
          setTimeout(() => {
            const element = document.getElementById(targetId);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [systemUser, customerUser]);

  // Fetch static data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const servicesData = await getServices();
        setServices(servicesData);

        const barbersData = await getBarbers();
        setBarbers(barbersData);

        const storeHoursData = await getStoreHours();
        setStoreHours(storeHoursData);
      } catch (e) {
        console.error('Error loading initial data:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 2500);
  };

  const copyShareUrl = () => {
    const shareUrl = window.location.origin + window.location.pathname;
    const triggerSuccess = () => showToast('Booking link copied to clipboard!');
    navigator.clipboard
      .writeText(shareUrl)
      .then(triggerSuccess)
      .catch(() => {
        const dummy = document.createElement('input');
        document.body.appendChild(dummy);
        dummy.value = shareUrl;
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
        triggerSuccess();
      });
  };

  const saveAppointment = async (bookingData: {
    service: Service;
    barber: Barber;
    date: Date;
    time: string;
    fullName: string;
    phone: string;
    email: string;
    emailReminder: boolean;
  }) => {
    return await clientSaveAppointment(bookingData, customerUser);
  };

  const handleNavigate = (hash: string) => {
    window.location.hash = hash;
    if (hash === '#/track') {
      setView('tracker');
    } else if (hash === '#/login') {
      setView('customer-login');
    } else if (hash === '#/signup') {
      setView('customer-signup');
    } else if (hash === '#/profile') {
      setView('customer-profile');
    } else {
      setView('booking');
    }
  };

  if (view === 'admin-dashboard') {
    return <AdminDashboard onLogout={handleAdminLogout} systemUser={systemUser} />;
  }

  if (view === 'admin-appointments') {
    return <AdminAppointments onLogout={handleAdminLogout} systemUser={systemUser} />;
  }

  if (view === 'admin-services') {
    return <AdminServices onLogout={handleAdminLogout} systemUser={systemUser} />;
  }

  if (view === 'admin-barbers') {
    return <AdminBarbers onLogout={handleAdminLogout} systemUser={systemUser} />;
  }

  if (view === 'admin-customers') {
    return <AdminCustomers onLogout={handleAdminLogout} systemUser={systemUser} />;
  }

  if (view === 'admin-activity') {
    return <AdminActivityLog onLogout={handleAdminLogout} systemUser={systemUser} />;
  }

  if (view === 'admin-reports') {
    return <AdminReports onLogout={handleAdminLogout} systemUser={systemUser} />;
  }

  if (view === 'admin-profile') {
    return <AdminProfile onLogout={handleAdminLogout} systemUser={systemUser} />;
  }

  if (view === 'admin-store-hours') {
    return <AdminStoreHours onLogout={handleAdminLogout} systemUser={systemUser} />;
  }

  return (
    <>
      <ClientHeader
        customerUser={customerUser}
        currentView={view}
        onNavigate={handleNavigate}
        onLogout={handleCustomerLogout}
        onShare={copyShareUrl}
      />

      <main className="main-wrapper">
        <div className="main-container">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
              <h3>Loading studio details...</h3>
            </div>
          ) : view === 'admin-login' ? (
            <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />
          ) : view === 'customer-login' ? (
            <CustomerLogin onLoginSuccess={handleCustomerLoginSuccess} onNavigate={handleNavigate} />
          ) : view === 'customer-signup' ? (
            <CustomerSignup onSignupSuccess={handleCustomerLoginSuccess} onNavigate={handleNavigate} />
          ) : view === 'customer-profile' && customerUser ? (
            <CustomerProfile
              customerUser={customerUser}
              onNavigate={handleNavigate}
              onUpdateCustomerUser={handleUpdateCustomerUser}
            />
          ) : view === 'booking' ? (
            <>
              <section id="services" className="page-section section-booking">
                <BookingWizard
                  services={services}
                  barbers={barbers}
                  storeHours={storeHours}
                  customerUser={customerUser}
                  onSaveAppointment={saveAppointment}
                  onNavigate={handleNavigate}
                />
              </section>

              <TeamShowcase barbers={barbers} />

              <section id="about" className="page-section section-about">
                <div className="section-container">
                  <div className="about-grid">
                    <div className="about-content">
                      <h2 className="section-title">About Us</h2>
                      <p className="about-desc">
                        The Foundry Barber Studio is a modern barbershop in Cabuyao, Laguna, specializing in precision haircuts, personalized hair consultations, and premium grooming services. We serve students, professionals, and gentlemen by providing hairstyles tailored to their face shape, hair type, and lifestyle. Every service is delivered with attention to detail, consistency, and client comfort in a clean and welcoming environment.
                      </p>

                      <div className="contact-block">
                        <div className="contact-header-with-logo">
                          <img src="/images/logo.jpg" alt="Foundry Barber Studio Logo" className="contact-logo" />
                          <h3 className="contact-title" style={{ margin: 0 }}>Contact Us</h3>
                        </div>
                        <div className="contact-links">
                          <a href="tel:09943543318" className="contact-link-item">
                            <i className="bi bi-telephone-fill"></i>
                            <span>0994 354 3318</span>
                          </a>
                          <a href="mailto:kesselgerhardt@gmail.com" className="contact-link-item">
                            <i className="bi bi-envelope-fill"></i>
                            <span>kesselgerhardt@gmail.com</span>
                          </a>
                          <a href="https://www.facebook.com/profile.php?id=61590664191724" target="_blank" rel="noopener noreferrer" className="contact-link-item">
                            <i className="bi bi-facebook" style={{ color: '#1877F2' }}></i>
                            <span>Facebook</span>
                          </a>
                          <a href="https://www.instagram.com/thefoundrybarberstudio/" target="_blank" rel="noopener noreferrer" className="contact-link-item">
                            <i className="bi bi-instagram" style={{ color: '#E1306C' }}></i>
                            <span>Instagram</span>
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="about-media">
                      <div className="about-frame">
                        <img src="/images/logo.jpg" alt="Foundry Barber Studio Atmosphere" className="about-img" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section id="address" className="page-section section-address">
                <div className="section-container">
                  <div className="section-header">
                    <h2 className="section-title">Address</h2>
                    <p className="section-subtitle">Blk 11, Homes, Lot 48 Katapatan Rd, Cabuyao City, 4025 Laguna
                      <br />(Behind Pamantasan ng Cabuyao)</p>
                  </div>

                  <div className="map-wrapper">
                    <iframe
                      className="google-map-iframe"
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3868.141079361664!2d121.13086277586574!3d14.259386585976562!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d900178b6af1%3A0xe30cabb078f266a2!2sThe%20Foundry%20Barber%20Studio!5e0!3m2!1sen!2sph!4v1718800000000!5m2!1sen!2sph"
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      style={{ border: 0 }}
                    ></iframe>
                  </div>
                </div>
              </section>

              <section id="book-cta" className="page-section section-cta">
                <div className="section-container">
                  <div className="cta-card">
                    <div className="cta-image-wrapper">
                      <img src="/images/barbershop.jpg" alt="Foundry Barber Studio Barbershop" className="cta-img" />
                    </div>
                    <div className="cta-content">
                      <div className="cta-badge">UPGRADE YOUR LOOK</div>
                      <h2 className="cta-title">Ready for Your Fresh Cut?</h2>
                      <p className="cta-desc">Experience premium grooming, classic craftsmanship, and high-precision fades. Step into Foundry Barber Studio today.</p>
                      <button
                        onClick={() => {
                          handleNavigate('#services');
                          window.location.hash = '#services';
                          const el = document.getElementById('services');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="cta-button"
                      >
                        <span>Book Now</span>
                        <i className="bi bi-arrow-right"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <BookingTracker />
          )}
        </div>
      </main>

      {toastMessage && (
        <div className={`toast-notification ${toastVisible ? 'show' : ''}`}>
          <i className="bi bi-check-circle-fill"></i>
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}

export default App;
