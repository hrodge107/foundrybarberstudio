import React, { useState } from 'react';
import { signupCustomer } from '../../../services/auth';
import type { CustomerUser } from '../../../../shared/types/user';

interface CustomerSignupProps {
  onSignupSuccess: (customer: CustomerUser) => void;
  onNavigate: (hash: string) => void;
}

export const CustomerSignup: React.FC<CustomerSignupProps> = ({ onSignupSuccess, onNavigate }) => {
  const [firstName, setFirstName] = useState<string>('');
  const [middleName, setMiddleName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Name Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both your First Name and Last Name.');
      return;
    }

    // 2. Contact Method Validation (at least one required)
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();

    if (!cleanEmail && !cleanPhone) {
      setError('Please provide at least one contact method (Email or Phone number).');
      return;
    }

    // 3. Email Format Check if provided
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    // 4. Philippine Phone Format Check if provided (Strictly 11 digits starting with 09)
    if (cleanPhone && !/^09\d{9}$/.test(cleanPhone)) {
      setError('Phone number must be exactly 11 digits starting with 09 (e.g., 09171234567).');
      return;
    }

    // 5. Password Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    setIsLoading(true);

    try {
      // 7. Normalize Name into single string attribute
      const normalizedName = [firstName.trim(), middleName.trim(), lastName.trim()]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ');

      const customerUser = await signupCustomer(
        normalizedName,
        cleanEmail || null,
        cleanPhone || null,
        password
      );

      onSignupSuccess(customerUser);
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="customer-signup-container"
      style={{
        maxWidth: '520px',
        margin: '40px auto',
        padding: '40px 32px',
        backgroundColor: 'rgba(18, 18, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
        color: '#f5f5f7',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '8px', color: '#f5f5f7' }}>
          Create Account
        </h2>
        <p style={{ color: '#9a9ab0', fontSize: '0.92rem' }}>
          Join Foundry Barber Studio for exclusive grooming management
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(255, 77, 79, 0.12)',
            border: '1px solid rgba(255, 77, 79, 0.3)',
            color: '#ff4d4f',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Name Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#9a9ab0' }}>
              First Name *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jose"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#f5f5f7',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#ffffff')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#9a9ab0' }}>
              Middle Name <span style={{ color: '#64748b' }}>(Optional)</span>
            </label>
            <input
              type="text"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              placeholder="Protacio"
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#f5f5f7',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#ffffff')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
            />
          </div>
        </div>

        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#9a9ab0' }}>
            Last Name *
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Rizal"
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#f5f5f7',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#ffffff')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
          />
        </div>

        <div style={{ padding: '8px 0 2px 0', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '0.82rem', color: '#f5f5f7', fontWeight: 600, letterSpacing: '0.2px' }}>
            Contact Credentials <span style={{ color: '#9a9ab0', fontWeight: 400 }}>(Provide Email or Phone)</span>
          </span>
        </div>

        {/* Contact Fields */}
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#9a9ab0' }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. juan@example.com"
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#f5f5f7',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#ffffff')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
          />
        </div>

        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#9a9ab0' }}>
            Phone Number <span style={{ color: '#64748b' }}>(11 digits starting with 09)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09XXXXXXXXX"
            maxLength={11}
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#f5f5f7',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#ffffff')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
          />
        </div>

        <div style={{ padding: '8px 0 2px 0', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '0.82rem', color: '#f5f5f7', fontWeight: 600 }}>
            Security Setup
          </span>
        </div>

        {/* Password Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#9a9ab0' }}>
              Password *
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 chars"
                required
                style={{
                  width: '100%',
                  padding: '12px 38px 12px 14px',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#f5f5f7',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#ffffff')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#9a9ab0',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className={`bi bi-eye${showPassword ? '-slash' : ''}`} style={{ fontSize: '1rem' }}></i>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#9a9ab0' }}>
              Confirm Password *
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type password"
                required
                style={{
                  width: '100%',
                  padding: '12px 38px 12px 14px',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#f5f5f7',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#ffffff')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#9a9ab0',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className={`bi bi-eye${showConfirmPassword ? '-slash' : ''}`} style={{ fontSize: '1rem' }}></i>
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '14px',
            marginTop: '10px',
            backgroundColor: '#ffffff',
            color: '#0e0e10',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.backgroundColor = '#e0e0e5';
          }}
          onMouseLeave={(e) => {
            if (!isLoading) e.currentTarget.style.backgroundColor = '#ffffff';
          }}
        >
          {isLoading ? 'Creating Account...' : 'Complete Registration'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <span style={{ fontSize: '0.88rem', color: '#9a9ab0' }}>Already have an account? </span>
          <button
            type="button"
            onClick={() => onNavigate('#/login')}
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
            Sign In here
          </button>
        </div>
      </form>
    </div>
  );
};
