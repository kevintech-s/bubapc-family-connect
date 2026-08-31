import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { familyService, announcementService, devotionService, scriptureService, fridayService, cancellationService, attendanceService, prayerRequestService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface FamilyDetail {
  id: number;
  name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  photo_url: string;
  logo_url?: string;
  theme_scripture?: string;
  theme_of_week?: string;
  leader_male_name?: string;
  leader_female_name?: string;
  members?: any[];
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  is_important: boolean;
  scope: 'global' | 'family';
  family_id: number | null;
  family_name?: string;
  author_name?: string;
  published_at: string;
}

interface Devotion { id: number; title: string; content: string; scripture: string; author_name?: string; created_at: string; }

const CATEGORIES = ['General', 'Health', 'Family', 'Guidance', 'Financial', 'Spiritual', 'Gratitude', 'Other'];

function getNextFriday(): Date {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() + ((5 - now.getDay() + 7) % 7));
  d.setHours(18, 0, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 7);
  return d;
}

export default function FamilyDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const familyId = parseInt(id || '0');
  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScriptureForm, setShowScriptureForm] = useState(false);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [scripture, setScripture] = useState<{ content: string; reference: string } | null>(null);
  const [devotions, setDevotions] = useState<Devotion[]>([]);
  const [friday, setFriday] = useState<any>(null);
  const [cancelled, setCancelled] = useState<any>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [prayers, setPrayers] = useState<any[]>([]);

  const isLeader = user?.role === 'family_leader' || user?.role === 'family_coordinator' || user?.role === 'pastor';
  const isStaff = user?.role === 'family_coordinator' || user?.role === 'pastor';
  const canManageThisFamily = isLeader;

  const nextFriday = useMemo(() => getNextFriday(), []);

  useEffect(() => { loadAll(); }, [id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const famRes = await familyService.getById(familyId);
      setFamily(famRes.data);

      const [annRes, devRes, scRes, fridayRes, cancelRes] = await Promise.all([
        announcementService.getAll().catch(() => ({ data: [] })),
        devotionService.getAll(familyId).catch(() => ({ data: [] })),
        scriptureService.getToday().catch(() => ({ data: null })),
        fridayService.getQuestion(familyId).catch(() => ({ data: null })),
        cancellationService.getUpcoming().catch(() => ({ data: null })),
      ]);
      setAnnouncements(annRes.data || []);
      setDevotions(devRes.data || []);
      setScripture(scRes.data || null);
      setFriday(fridayRes.data || null);
      setCancelled(cancelRes.data || null);

      if (isStaff) {
        prayerRequestService.getAll().then((res) => setPrayers(res.data || [])).catch(() => {});
      }
    } catch (error) {
      toast.error('Failed to load family');
    } finally {
      setLoading(false);
    }
  };

  const familyAnnouncements = announcements.filter(
    (a) => a.scope === 'global' || a.family_id === familyId
  );

  const isFriday = new Date().getDay() === 5;
  const countdownDays = Math.max(0, Math.ceil((nextFriday.getTime() - Date.now()) / 86400000));
  const nextFridayCancelled = cancelled?.cancellation_date === nextFriday.toISOString().slice(0, 10);

  const handleSelfCheckIn = async () => {
    setCheckingIn(true);
    try {
      await attendanceService.selfCheckIn(new Date().toISOString().split('T')[0]);
      setCheckedIn(true);
      toast.success('Checked in for today');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const submitPrayer = async (e: FormEvent) => {
    e.preventDefault();
    const title = (e.currentTarget as any).title.value;
    const description = (e.currentTarget as any).description.value;
    const category = (e.currentTarget as any).category.value;
    if (!title || !description) { toast.error('Title and description are required'); return; }
    try {
      await prayerRequestService.create({ title, description, category });
      toast.success('Prayer request submitted');
      (e.currentTarget as any).reset();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit');
    }
  };

  const createDevotion = async (e: FormEvent) => {
    e.preventDefault();
    const title = (e.currentTarget as any).title.value;
    const content = (e.currentTarget as any).content.value;
    const scripture_txt = (e.currentTarget as any).scripture.value;
    if (!title || !content) { toast.error('Title and content are required'); return; }
    try {
      await devotionService.create({ family_id: familyId, title, content, scripture: scripture_txt });
      toast.success('Devotion added');
      (e.currentTarget as any).reset();
      const res = await devotionService.getAll(familyId);
      setDevotions(res.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add devotion');
    }
  };

  const submitFridayAnswer = async (e: FormEvent) => {
    e.preventDefault();
    const answer = (e.currentTarget as any).answer.value;
    if (!friday || !answer) { toast.error('Answer is required'); return; }
    try {
      await fridayService.answerQuestion(friday.id, answer);
      toast.success('Answer submitted');
      const res = await fridayService.getQuestion(familyId);
      setFriday(res.data || null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit answer');
    }
  };

  const createFridayQuestion = async (e: FormEvent) => {
    e.preventDefault();
    const question = (e.currentTarget as any).question.value;
    if (!question) { toast.error('Question is required'); return; }
    try {
      await fridayService.createQuestion({ family_id: familyId, question, service_date: new Date().toISOString().slice(0, 10) });
      toast.success('Question posted');
      (e.currentTarget as any).reset();
      const res = await fridayService.getQuestion(familyId);
      setFriday(res.data || null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to post question');
    }
  };

  const saveFamilyTheme = async (e: FormEvent) => {    e.preventDefault();
    const theme_of_week = (e.currentTarget as any).theme_of_week.value;
    const theme_scripture = (e.currentTarget as any).theme_scripture.value;
    const logo_url = (e.currentTarget as any).logo_url.value;
    const payload: any = { theme_of_week, theme_scripture };
    if (logo_url) payload.logo_url = logo_url;
    try {
      await familyService.updateFields(familyId, payload);
      toast.success('Family theme updated');
      const res = await familyService.getById(familyId);
      setFamily(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update theme');
    }
  };

  const setTodayScripture = async (e: FormEvent) => {
    e.preventDefault();
    const content = (e.currentTarget as any).scripture_content.value;
    const reference = (e.currentTarget as any).scripture_reference.value;
    if (!content) { toast.error('Scripture content is required'); return; }
    try {
      await scriptureService.set({ scripture_date: new Date().toISOString().slice(0, 10), content, reference });
      toast.success('Scripture of the day updated');
      setShowScriptureForm(false);
      const res = await scriptureService.getToday();
      setScripture(res.data || null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to set scripture');
    }
  };

  const cancelFriday = async (e: FormEvent) => {
    e.preventDefault();
    const cancellation_date = (e.currentTarget as any).cancellation_date.value;
    const reason = (e.currentTarget as any).cancel_reason.value;
    if (!cancellation_date || !reason) { toast.error('Date and reason are required'); return; }
    try {
      await cancellationService.create({ cancellation_date, reason });
      toast.success('Friday service cancelled');
      (e.currentTarget as any).reset();
      const res = await cancellationService.getUpcoming();
      setCancelled(res.data || null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to cancel Friday');
    }
  };

  const removeCancellation = async (id: number) => {
    try {
      await cancellationService.remove(id);
      toast.success('Cancellation removed');
      const res = await cancellationService.getUpcoming();
      setCancelled(res.data || null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove cancellation');
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

      {/* Header */}
      <div className="card">
        <div className="flex items-start gap-4">
          {family.logo_url ? (
            <img src={family.logo_url} alt={family.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl flex-shrink-0">
              {family.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{family.name}</h1>
            <p className="text-gray-500 mt-1">{family.description || 'No description available.'}</p>
            {(family.leader_male_name || family.leader_female_name) && (
              <p className="text-xs text-gray-400 mt-1">
                {[family.leader_female_name && `Maama: ${family.leader_female_name}`, family.leader_male_name && `Paapa: ${family.leader_male_name}`].filter(Boolean).join('  ·  ')}
              </p>
            )}
          </div>
        </div>

        {/* Countdown */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          {nextFridayCancelled ? (
            <div className="flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <div>
                <p className="text-sm font-semibold text-red-800">This Friday's service is cancelled</p>
                <p className="text-xs text-red-600">{cancelled.reason}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-primary-50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-primary-600 uppercase tracking-wide">Next Family Service</p>
                <p className="text-sm font-semibold text-primary-900">
                  {nextFriday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary-700">{isFriday ? 'Today' : `${countdownDays} day${countdownDays === 1 ? '' : 's'}`}</p>
                <p className="text-xs text-primary-500">{isFriday ? 'Service today' : 'to go'}</p>
              </div>
            </div>
          )}
        </div>

        {/* This week's theme */}
        {(family.theme_of_week || family.theme_scripture) && (
          <div className="mt-4 rounded-lg bg-warm-100 px-4 py-3">
            <p className="text-xs font-medium text-warm-700 uppercase tracking-wide">Theme of the Week</p>
            {family.theme_of_week && <p className="text-sm font-medium text-gray-900 mt-0.5">{family.theme_of_week}</p>}
            {family.theme_scripture && <p className="text-sm italic text-gray-600 mt-0.5">{family.theme_scripture}</p>}
          </div>
        )}
      </div>

      {/* Manage Friday (staff) */}
      {isStaff && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900">Manage Friday Service</h2>
          {cancelled ? (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-red-800">
                  {new Date(cancelled.cancellation_date).toLocaleDateString()} cancelled
                </p>
                <p className="text-xs text-red-600">{cancelled.reason}</p>
              </div>
              <button onClick={() => removeCancellation(cancelled.id)} className="px-3 py-1 text-xs font-medium rounded-lg border border-red-300 text-red-700 hover:bg-red-100 flex-shrink-0">
                Restore
              </button>
            </div>
          ) : (
            <form onSubmit={cancelFriday} className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Date</label>
                <input name="cancellation_date" type="date" defaultValue={nextFriday.toISOString().slice(0, 10)} className="input-field" required />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input name="cancel_reason" className="input-field" placeholder="e.g. Retreat" required />
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn-danger w-full">Cancel Friday</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Attendance */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
        {user?.role === 'member' ? (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">Check in for today's service (or your absence from the family).</p>
            <button onClick={handleSelfCheckIn} disabled={checkingIn || checkedIn} className="btn-primary disabled:bg-green-100 disabled:text-green-700 disabled:cursor-default">
              {checkedIn ? '✓ Checked in' : checkingIn ? 'Checking in...' : 'Check in'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">
            Manage the full attendance roster.{' '}
            <Link to="/attendance" className="text-primary-600 hover:text-primary-700 font-medium">Open attendance</Link>
          </p>
        )}
      </div>

      {/* Scripture of the day */}
      <div className="card">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          <h2 className="text-lg font-semibold text-gray-900">Scripture of the Day</h2>
          {isStaff && !showScriptureForm && (
            <button onClick={() => setShowScriptureForm(true)} className="ml-auto text-xs font-medium text-primary-600 hover:text-primary-700">
              {scripture ? 'Edit' : 'Add'}
            </button>
          )}
        </div>
        {scripture ? (
          <>
            <p className="mt-3 text-xl font-medium text-gray-800 italic leading-relaxed">“{scripture.content}”</p>
            {scripture.reference && <p className="mt-2 text-sm font-medium text-primary-700">{scripture.reference}</p>}
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-500">No scripture posted for today yet.</p>
        )}
        {isStaff && showScriptureForm && (
          <form onSubmit={setTodayScripture} className="mt-4 space-y-3 rounded-lg bg-gray-50 p-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scripture Content</label>
              <textarea name="scripture_content" className="input-field" rows={2} placeholder="e.g. The Lord is my shepherd..." required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference (optional)</label>
              <input name="scripture_reference" className="input-field" placeholder="e.g. Psalm 23:1" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Save Scripture</button>
              <button type="button" onClick={() => setShowScriptureForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* Announcements */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900">Announcements</h2>
        {familyAnnouncements.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No announcements yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {familyAnnouncements.map((ann) => (
              <div key={ann.id} className={`rounded-lg border border-gray-100 p-4 ${ann.is_important ? 'border-l-4 border-l-amber-400' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  {ann.is_important && <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Important</span>}
                  {ann.scope === 'family' && <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Family</span>}
                  <h3 className="font-semibold text-gray-900">{ann.title}</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{ann.content}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(ann.published_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Friday question */}
      <div className="card">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h2 className="text-lg font-semibold text-gray-900">This Week's Question</h2>
        </div>

        {isLeader && !friday && (
          <form onSubmit={createFridayQuestion} className="mt-3 space-y-2">
            <input name="question" className="input-field" placeholder="Ask the family a question for this Friday..." />
            <button type="submit" className="btn-primary">Post Question</button>
          </form>
        )}

        {friday && (
          <div className="mt-3">
            <p className="text-gray-800 font-medium">{friday.question}</p>
            {friday.role !== undefined && friday.role !== 'member' ? (
              <div className="mt-3">
                {friday.answers && friday.answers.length > 0 ? (
                  <div className="space-y-2">
                    {friday.answers.map((a: any) => (
                      <div key={a.id} className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-sm text-gray-700">{a.answer}</p>
                        <p className="text-xs text-gray-400 mt-0.5">— {a.member_name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No answers yet.</p>
                )}
              </div>
            ) : (
              <form onSubmit={submitFridayAnswer} className="mt-3 space-y-2">
                {friday.my_answer ? (
                  <p className="text-sm text-gray-500">Your answer: {friday.my_answer}</p>
                ) : (
                  <>
                    <textarea name="answer" className="input-field" rows={3} placeholder="Share your answer..." required />
                    <button type="submit" className="btn-primary">Submit Answer</button>
                  </>
                )}
              </form>
            )}
          </div>
        )}

        {!friday && !isLeader && <p className="text-sm text-gray-500 mt-2">No question posted for this week yet.</p>}
      </div>

      {/* Devotions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900">Daily Devotion</h2>
        {isLeader && canManageThisFamily && (
          <form onSubmit={createDevotion} className="mt-3 space-y-3 rounded-lg bg-gray-50 p-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input name="title" className="input-field" placeholder="Devotion title" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scripture (optional)</label>
              <input name="scripture" className="input-field" placeholder="e.g. John 3:16" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea name="content" className="input-field" rows={4} placeholder="Write the devotion..." required />
            </div>
            <button type="submit" className="btn-primary">Add Devotion</button>
          </form>
        )}
        {devotions.length === 0 ? (
          <p className="text-sm text-gray-500 mt-3">No devotions posted yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {devotions.map((d) => (
              <div key={d.id} className="rounded-lg border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">{d.title}</h3>
                {d.scripture && <p className="text-sm italic text-primary-700 mt-0.5">{d.scripture}</p>}
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{d.content}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {d.author_name ? `By ${d.author_name}` : ''} · {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prayer requests */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900">Prayer Requests</h2>
        <form onSubmit={submitPrayer} className="mt-3 space-y-3 rounded-lg bg-gray-50 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input name="title" className="input-field" placeholder="What can we pray for?" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" className="input-field" rows={3} placeholder="Share your prayer request..." required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select name="category" className="input-field" defaultValue="General">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary">Submit Prayer Request</button>
        </form>

        {isStaff && prayers.length > 0 && (
          <div className="mt-4 space-y-2">
            {prayers.map((p) => (
              <div key={p.id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{p.title}</span>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{p.category}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{p.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leader: edit theme */}
      {canManageThisFamily && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900">Family Theme &amp; Logo</h2>
          <form onSubmit={saveFamilyTheme} className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Theme of the Week</label>
              <input name="theme_of_week" defaultValue={family.theme_of_week || ''} className="input-field" placeholder="e.g. Walking in Faith" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Theme Scripture</label>
              <input name="theme_scripture" defaultValue={family.theme_scripture || ''} className="input-field" placeholder="e.g. Proverbs 3:5-6" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Family Logo URL (optional)</label>
              <input name="logo_url" defaultValue={family.logo_url || ''} className="input-field" placeholder="https://.../logo.png" />
            </div>
            <button type="submit" className="btn-primary">Save Theme</button>
          </form>
        </div>
      )}

      {/* Members */}
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
