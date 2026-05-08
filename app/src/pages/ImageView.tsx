import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';

export default function ImageView() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['upload', id],
    queryFn: () => api.getUpload(id!),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteUpload(id!),
    onSuccess: () => nav('/gallery'),
  });

  if (isLoading) return <p>Loading...</p>;
  if (!data) return <p>Not found.</p>;

  const copyLink = () => navigator.clipboard.writeText(`${window.location.origin}/i/${id}`);

  return (
    <div className="image-view">
      <img src={data.url} alt={data.title} style={{ maxWidth: '100%' }} />
      <h1>{data.title}</h1>
      {data.description && <p>{data.description}</p>}
      <Link to={`/u/${data.userDid}`}>@{data.userHandle || data.userDid}</Link>
      <div className="actions">
        <button onClick={copyLink}>Copy Link</button>
        {user?.did === data.userDid && (
          <button onClick={() => deleteMutation.mutate()} className="danger">Delete</button>
        )}
      </div>
    </div>
  );
}