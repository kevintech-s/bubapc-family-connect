import { useState, useEffect, FormEvent, useRef } from 'react';
import { photoService } from '../../services/api';
import { Photo } from '../../types';
import toast from 'react-hot-toast';

export default function AdminGalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('General');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['General', 'Family Events', 'Worship', 'Fellowship', 'Outreach', 'Other'];

  useEffect(() => { loadPhotos(); }, []);

  const loadPhotos = async () => {
    try {
      const res = await photoService.getAll();
      setPhotos(res.data);
    } catch (error) {
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) { toast.error('Please select a photo'); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('caption', caption);
      formData.append('category', category);
      await photoService.upload(formData);
      toast.success('Photo uploaded');
      setCaption('');
      setCategory('General');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadPhotos();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await photoService.delete(id);
      toast.success('Photo deleted');
      setDeleteConfirm(null);
      loadPhotos();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Gallery</h1>
        <p className="text-gray-500 mt-1">{photos.length} photos uploaded</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Photo</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo *</label>
              <input ref={fileInputRef} type="file" accept="image/*" className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
            <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} className="input-field" placeholder="Optional caption" />
          </div>
          <button type="submit" disabled={uploading} className="btn-primary">
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
        </form>
      </div>

      {photos.length === 0 ? (
        <div className="card text-center py-8"><p className="text-gray-500">No photos uploaded yet</p></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                {deleteConfirm === photo.id ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(photo.id)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700">Delete</button>
                    <button onClick={() => setDeleteConfirm(null)} className="bg-white/80 text-gray-900 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(photo.id)} className="opacity-0 group-hover:opacity-100 bg-white/80 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white transition-opacity">
                    Delete
                  </button>
                )}
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
