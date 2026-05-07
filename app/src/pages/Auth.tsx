import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Auth() {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuthStore();
  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(handle, password);
      nav('/gallery');
    } catch (e: any) {
      setError(e.message || 'Login failed. Check your credentials.');
    }
  };

  return (
    <div className="auth-page">
      <h1>Login with Bluesky</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="handle.bsky.social" value={handle} onChange={e => setHandle(e.target.value)} required />
        <input type="password" placeholder="App Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="hint">
        Need an app password? <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noreferrer">Create one at bsky.app</a>
      </p>
    </div>
  );
}