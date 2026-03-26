import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = login(email, password);
    if (!result.ok) {
      setError(result.error || 'Unable to login.');
      return;
    }
    navigate('/');
  };

  const openGoogleLogin = () => {
    window.open(
      'https://accounts.google.com/signin',
      'google-sso-popup',
      'width=520,height=640,noopener,noreferrer'
    );
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>
          Log in to <span>SKUEvolve</span>
        </h1>

        <button type="button" className="login-google-btn" onClick={openGoogleLogin}>
          <span className="login-google-mark">G</span>
          Login with Google
        </button>

        <div className="login-divider">
          <span />
          OR
          <span />
        </div>

        <form onSubmit={handleSubmit}>
          <label className="login-input-wrap">
            <Mail size={14} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="login-input-wrap">
            <Lock size={14} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="login-show-pass"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </label>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit-btn">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
