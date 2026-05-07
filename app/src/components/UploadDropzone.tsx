import { useState, useRef, useCallback } from 'react';

interface UploadDropzoneProps {
  onFile: (file: File) => void;
  file: File | null;
}

export default function UploadDropzone({ onFile, file }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) onFile(f);
  }, [onFile]);

  return (
    <div
      className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {file ? (
        <img src={URL.createObjectURL(file)} alt="Preview" className="preview-img" />
      ) : (
        <p>{dragging ? 'Drop it!' : 'Drag & drop an image or click to select'}</p>
      )}
    </div>
  );
}