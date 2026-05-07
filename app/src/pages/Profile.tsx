import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import ImageGrid from '../components/ImageGrid';

export default function Profile() {
  const { did } = useParams();
  const { data } = useQuery({
    queryKey: ['profile', did],
    queryFn: () => api.getUserUploads(did!),
    enabled: !!did,
  });

  return (
    <div className="profile-page">
      <h1>{did}</h1>
      <ImageGrid uploads={data?.items || []} />
    </div>
  );
}