import { useState, useEffect, FormEvent } from 'react';
import { reportService, familyService, effectiveServerUrl } from '../services/api';
import { Report } from '../types';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const [reports, setReports] = useState<Report[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ title: '', family_id: '', file: null as File | null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [reportsRes, familiesRes] = await Promise.all([
        reportService.getAll(),
        role === 'family_leader' || role === 'family_coordinator' ? familyService.getAll() : Promise.resolve({ data: [] }),
      ]);
      setReports(reportsRes.data);
      setFamilies(familiesRes.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadUrl = (report: Report) => {
    const base = effectiveServerUrl().replace(/\/api$/, '');
    return base + report.file_url;
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title) { toast.error('Title is required'); return; }
    if (!form.file) { toast.error('Please select a file'); return; }
    if (role === 'family_leader' && !form.family_id) { toast.error('Please select your family'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('file', form.file);
      if (form.family_id) fd.append('family_id', form.family_id);
      if (role === 'family_leader') fd.append('audience', 'coordinator');
      if (role === 'family_coordinator') fd.append('audience', 'pastor');
      await reportService.upload(fd);
      toast.success('Report uploaded');
      setForm({ title: '', family_id: '', file: null });
      setShowUpload(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await reportService.delete(id);
      toast.success('Report deleted');
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const isLeader = role === 'family_leader';
  const isCoordinator = role === 'family_coordinator';

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">
            {isLeader ? 'Submit reports to your coordinator' : isCoordinator ? 'Review family reports and send compiled reports to the pastor' : 'Reports received from coordinators'}
          </p>
        </div>
        {(isLeader || isCoordinator) && (
          <button onClick={() => setShowUpload(!showUpload)} className="btn-primary">
            {showUpload ? 'Cancel' : '+ Upload Report'}
          </button>
        )}
      </div>

      {(isLeader || isCoordinator) && showUpload && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {isLeader ? 'Submit Report to Coordinator' : 'Send Report to Pastor'}
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field"
                required
              />
            </div>
            {isLeader && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Family *</label>
                <select
                  value={form.family_id}
                  onChange={(e) => setForm({ ...form, family_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select family</option>
                  {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File (PDF, DOC, DOCX) *</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                className="input-field"
                required
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Uploading...' : 'Upload Report'}
            </button>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Title</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Family</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Author</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-400">No reports available</td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-medium text-gray-900">{report.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{report.family_name || '-'}</td>
                  <td className="py-3 px-4 text-gray-500">{report.author_name || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 uppercase">{report.file_type || 'file'}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{new Date(report.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <a href={downloadUrl(report)} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700 text-xs font-medium">View/Download</a>
                      {report.author_id === user?.id && (
                        <button onClick={() => handleDelete(report.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
