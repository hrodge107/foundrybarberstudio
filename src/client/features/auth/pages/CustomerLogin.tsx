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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

        <PasswordInput
          id="customer-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          disabled={isLoading}
        />

        <button type="submit" className="btn-auth-submit" disabled={isLoading}>
          {isLoading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
    </AuthCard>
  );
};
