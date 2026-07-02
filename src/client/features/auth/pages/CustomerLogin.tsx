import React, { useState } from 'react';
import { loginCustomer } from '../../../services/auth';
import type { CustomerUser } from '../../../../shared/types/user';
import { AuthCard, PasswordInput } from '../components/AuthCard';

interface CustomerLoginProps {
  onLoginSuccess: (customer: CustomerUser) => void;
  onNavigate: (hash: string) => void;
}

export const CustomerLogin: React.FC<CustomerLoginProps> = ({ onLoginSuccess, onNavigate }) => {
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [forgotMsg, setForgotMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotMsg('');

    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email/phone and password.');
      return;
    }

    setIsLoading(true);

    try {
      const customerUser = await loginCustomer(identifier, password);
      onLoginSuccess(customerUser);
    } catch (err: any) {
      console.error('Customer login error:', err);
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const footer = (
    <>
      <div>
        <span style={{ fontSize: '0.88rem', color: '#9a9ab0' }}>Don't have an account? </span>
        <button
          type="button"
          onClick={() => onNavigate('#/signup')}
          style={{
            background: 'none',
            border: 'none',
            color: '#f5f5f7',
            fontSize: '0.88rem',
            cursor: 'pointer',
            fontWeight: 600,
            textDecoration: 'underline',
          }}
        >
          Sign Up here
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: '8px',
        marginBottom: '4px'
      }}>
        <a
          href="https://www.facebook.com/profile.php?id=61590664191724"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#9a9ab0',
            fontSize: '0.8rem',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#f5f5f7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#9a9ab0';
          }}
        >
          <i className="bi bi-facebook"></i> Facebook
        </a>
        <a
          href="https://www.instagram.com/thefoundrybarberstudio/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#9a9ab0',
            fontSize: '0.8rem',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#f5f5f7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#9a9ab0';
          }}
        >
          <i className="bi bi-instagram"></i> Instagram
        </a>
        <a
          href="mailto:kesselgerhardt@gmail.com"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#9a9ab0',
            fontSize: '0.8rem',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#f5f5f7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#9a9ab0';
          }}
        >
          <i className="bi bi-envelope-fill"></i> Email
        </a>
      </div>

      <button
        type="button"
        className="auth-card-footer-link"
        onClick={() => onNavigate('#services')}
      >
        &larr; Back to Services & Booking
      </button>
    </>
  );

  return (
    <AuthCard
      title="Customer Login"
      subtitle="Access your appointments & studio profile"
      errorMessage={error}
      footerContent={footer}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="customer-identifier">Email or Phone Number</label>
          <input
            id="customer-identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g., 09943543318 or client@example.com"
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '4px' }}>
          <PasswordInput
            id="customer-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={isLoading}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => setForgotMsg('Contact Admin for password reset')}
              style={{
                background: 'none',
                border: 'none',
                color: '#9a9ab0',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '4px 0',
              }}
            >
              Forgot Password?
            </button>
          </div>
        </div>

        {forgotMsg && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f5f5f7',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            marginTop: '8px',
          }}>
            <i className="bi bi-info-circle-fill" style={{ marginRight: '8px', color: '#f5a623' }}></i>
            <span>{forgotMsg}</span>
          </div>
        )}

        <button type="submit" className="btn-auth-submit" disabled={isLoading}>
          {isLoading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
    </AuthCard>
  );
};
