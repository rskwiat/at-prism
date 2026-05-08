import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface LikeButtonProps {
  uploadId: string;
  likeCount: number;
  hasLiked: boolean;
  onLike?: () => void;
}

export default function LikeButton({ uploadId, likeCount, hasLiked, onLike }: LikeButtonProps) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const nav = useNavigate();

  const mutation = useMutation({
    mutationFn: () => hasLiked ? api.unlike(uploadId) : api.like(uploadId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uploads'] });
      qc.invalidateQueries({ queryKey: ['upload', uploadId] });
      onLike?.();
    },
  });

  if (!user) {
    return (
      <button className="like-btn" onClick={() => nav('/auth')} title="Login to like">
        ♡ {likeCount}
      </button>
    );
  }

  return (
    <button
      className={`like-btn ${hasLiked ? 'liked' : ''}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); mutation.mutate(); }}
      disabled={mutation.isPending}
    >
      {hasLiked ? '♥' : '♡'} {likeCount}
    </button>
  );
}