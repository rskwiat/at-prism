import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import ImageGrid from '../components/ImageGrid';
import { useAuthStore } from '../stores/authStore';

export default function Gallery() {
  const { user, checkAuth } = useAuthStore();
  const nav = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) nav('/auth');
  }, [user]);

  const { data } = useQuery({
    queryKey: ['gallery', user?.did],
    queryFn: () => api.getUserUploads(user!.did),
    enabled: !!user,
  });

  return (
    <div className="gallery-page">
      <h1>My Gallery</h1>
      <ImageGrid uploads={data?.items || []} />
    </div>
  );
}