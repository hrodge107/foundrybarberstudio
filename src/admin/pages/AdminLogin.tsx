import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import type { SystemUser } from '../../App';
import { AuthCard, PasswordInput } from '../../client/components/AuthCard';

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

    const trimmedUser = username.trim();

    try {
      // Query system_users table
      let { data, error } = await supabase
        .from('system_users')
        .select('id, username, password_hash, role')
        .eq('username', trimmedUser)
        .maybeSingle();

      // Fallback for database before migration / admins table compatibility
      if (error || !data) {
        const fallback = await supabase
          .from('admins')
          .select('id, username, password_hash')
          .eq('username', trimmedUser)
          .maybeSingle();
        if (fallback.data) {
          data = { ...fallback.data, role: 'admin' };
          error = null;
        }
      }

      let userObj: SystemUser | null = null;

      if (!error && data && data.password_hash === password) {
        userObj = {
          id: data.id,
          username: data.username,
          role: data.role || 'admin',
        };
      }

      if (userObj) {
        if (userObj.role === 'barber') {
          const { data: bData } = await supabase
            .from('barbers')
            .select('id')
            .eq('user_id', userObj.id)
            .maybeSingle();
          if (bData) {
            userObj.barber_id = bData.id;
          }
        }
        onLoginSuccess(userObj);
        window.location.hash = '#/admin/dashboard';
      } else {
        setErrorMessage('Invalid username or password.');
      }
    } catch (err: unknown) {
      console.error('Admin login error:', err);
      setErrorMessage('An error occurred during login. Please try again.');
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
