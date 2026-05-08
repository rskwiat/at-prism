import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="logo">ImgurBSKY</Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link to="/upload">Upload</Link>
            <Link to="/gallery">My Gallery</Link>
            <Link to={`/u/${user.did}`}>{user.displayName || user.handle}</Link>
            <button onClick={async () => { await logout(); nav('/'); }}>Logout</button>
          </>
        ) : (
          <Link to="/auth">Login with Bluesky</Link>
        )}
      </div>
    </nav>
  );
}