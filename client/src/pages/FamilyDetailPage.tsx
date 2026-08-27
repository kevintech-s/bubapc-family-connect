import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { familyService } from '../services/api';
import { Family } from '../types';

export default function FamilyDetailPage() {
  const { id } = useParams();
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadFamily(parseInt(id));
    }
  }, [id]);

  const loadFamily = async (familyId: number) => {
    try {
      const res = await familyService.getById(familyId);
      setFamily(res.data);
    } catch (error) {
      console.error('Failed to load family:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="card text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Family not found</h3>
        <Link to="/families" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">Back to families</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/families" className="hover:text-primary-600">Families</Link>
        <span>/</span>
        <span className="text-gray-900">{family.name}</span>
      </div>

      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl flex-shrink-0">
            {family.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{family.name}</h1>
            <p className="text-gray-500 mt-1">{family.description || 'No description available.'}</p>
          </div>
        </div>

        {(family.contact_email || family.contact_phone || family.address) && (
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            {family.contact_email && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                <p className="text-sm text-gray-900 mt-0.5">{family.contact_email}</p>
              </div>
            )}
            {family.contact_phone && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</p>
                <p className="text-sm text-gray-900 mt-0.5">{family.contact_phone}</p>
              </div>
            )}
            {family.address && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Address</p>
                <p className="text-sm text-gray-900 mt-0.5">{family.address}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Family Members</h2>
        {family.members && family.members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {family.members.map((member) => (
              <div key={member.id} className="card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center text-warm-700 font-semibold text-sm">
                    {member.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{member.full_name}</h3>
                    <p className="text-xs text-gray-500">{member.role_in_family}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                  {member.email && <p className="text-xs text-gray-500 truncate">{member.email}</p>}
                  {member.phone && <p className="text-xs text-gray-500">{member.phone}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-sm text-gray-500">No members in this family yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
