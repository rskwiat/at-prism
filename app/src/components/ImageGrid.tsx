import ImageCard from './ImageCard';

interface ImageGridProps {
  uploads: any[];
  onLike?: () => void;
}

export default function ImageGrid({ uploads, onLike }: ImageGridProps) {
  if (!uploads.length) return <p className="empty-state">No uploads yet. Be the first!</p>;

  return (
    <div className="image-grid">
      {uploads.map(u => <ImageCard key={u.id} upload={u} onLike={onLike} />)}
    </div>
  );
}