import React, { useState } from 'react';
import { loginAdmin } from '../../../services/auth';
import type { SystemUser } from '../../../../shared/types/user';
import { AuthCard, PasswordInput } from '../../../../client/features/auth/components/AuthCard';

interface AdminLoginProps {
  onLoginSuccess: (user: SystemUser) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const userObj = await loginAdmin(username, password);
      onLoginSuccess(userObj);
      window.location.hash = '#/admin/dashboard';
    } catch (err: any) {
      console.error('Admin login error:', err);
      setErrorMessage(err.message || 'An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const footer = (
    <a href="#/" className="auth-card-footer-link">
      &larr; Return to Client Portal
    </a>
  );

  return (
    <AuthCard
      title="Admin Portal"
      subtitle="Enter your credentials to access management dashboard"
      errorMessage={errorMessage}
      footerContent={footer}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="admin-username">Username</label>
          <input
            id="admin-username"
            type="text"
            required
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <PasswordInput
          id="admin-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
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
