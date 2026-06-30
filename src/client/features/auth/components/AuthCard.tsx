import React, { useState } from 'react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  errorMessage?: string | null;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  title,
  subtitle,
  errorMessage,
  children,
  footerContent,
}) => {
  return (
    <div className="auth-container-wrapper">
      <div className="auth-card">
        <div className="auth-card-header">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        {errorMessage && (
          <div className="auth-error-banner">
            <i className="bi bi-exclamation-circle-fill" style={{ marginRight: '8px' }}></i>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="auth-card-body">{children}</div>

        {footerContent && <div className="auth-card-footer">{footerContent}</div>}
      </div>
    </div>
  );
};

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ label = 'Password', ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="form-group">
      <label htmlFor={props.id || 'password-input'}>{label}</label>
      <div className="password-input-wrapper">
        <input
          {...props}
          id={props.id || 'password-input'}
          type={showPassword ? 'text' : 'password'}
        />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowPassword(!showPassword)}
          title={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
        </button>
      </div>
    </div>
  );
};
