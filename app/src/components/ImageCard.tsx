import { Link } from 'react-router-dom';
import LikeButton from './LikeButton';

interface ImageCardProps {
  upload: {
    id: string;
    title: string;
    thumbnailUrl: string;
    width: number;
    height: number;
    likeCount: number;
    hasLiked?: boolean;
    userDid: string;
    userHandle?: string;
  };
  onLike?: () => void;
}

export default function ImageCard({ upload, onLike }: ImageCardProps) {
  return (
    <div className="image-card">
      <Link to={`/i/${upload.id}`}>
        <img src={upload.thumbnailUrl} alt={upload.title} loading="lazy" />
      </Link>
      <div className="card-info">
        <Link to={`/i/${upload.id}`} className="card-title">{upload.title}</Link>
        <div className="card-meta">
          <LikeButton uploadId={upload.id} likeCount={upload.likeCount} hasLiked={upload.hasLiked} onLike={onLike} />
          <Link to={`/u/${upload.userDid}`} className="user-link">@{upload.userHandle}</Link>
        </div>
      </div>
    </div>
  );
}