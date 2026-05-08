import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Upload from './pages/Upload';
import ImageView from './pages/ImageView';
import Auth from './pages/Auth';
import Gallery from './pages/Gallery';
import Profile from './pages/Profile';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/i/:id" element={<ImageView />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/u/:did" element={<Profile />} />
        </Routes>
      </main>
    </>
  );
}