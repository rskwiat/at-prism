import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import UploadDropzone from '../components/UploadDropzone';
import { useAuthStore } from '../stores/authStore';

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [shareToBluesky, setShareToBluesky] = useState(false);
  const [blueskyCaption, setBlueskyCaption] = useState('');
  const nav = useNavigate();
  const { user } = useAuthStore();

  const mutation = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('file', file!);
      form.append('title', title);
      form.append('description', description);
      form.append('isPublic', String(isPublic));
      form.append('shareToBluesky', String(shareToBluesky));
      if (shareToBluesky) form.append('blueskyCaption', blueskyCaption || title);
      return api.upload(form);
    },
    onSuccess: (data: any) => nav(`/i/${data.id}`),
  });

  if (!user) {
    return <p>Please <a href="/auth">login</a> to upload.</p>;
  }

  return (
    <div className="upload-page">
      <h1>Upload Image</h1>
      <UploadDropzone onFile={setFile} file={file} />
      <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
      <label>
        <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
        Public (visible in gallery)
      </label>
      <label>
        <input type="checkbox" checked={shareToBluesky} onChange={e => setShareToBluesky(e.target.checked)} />
        Also post to Bluesky
      </label>
      {shareToBluesky && (
        <input placeholder="Bluesky caption" value={blueskyCaption} onChange={e => setBlueskyCaption(e.target.value)} />
      )}
      <button onClick={() => mutation.mutate()} disabled={!file || !title || mutation.isPending}>
        {mutation.isPending ? 'Uploading...' : 'Upload'}
      </button>
      {mutation.isError && <p className="error">Upload failed. Try again.</p>}
    </div>
  );
}