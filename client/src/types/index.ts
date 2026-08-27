export interface User {
  id: number;
  email: string;
  name: string;
  role: 'member' | 'family_leader' | 'family_coordinator' | 'pastor';
  is_active: boolean;
  created_at: string;
}

export interface Family {
  id: number;
  name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  photo_url: string;
  leader_male_id: number | null;
  leader_female_id: number | null;
  leader_male_name?: string;
  leader_female_name?: string;
  member_count?: number;
  members?: Member[];
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: number;
  user_id: number | null;
  family_id: number;
  full_name: string;
  email: string;
  phone: string;
  profile_photo: string;
  gender: 'male' | 'female' | '';
  birthday: string | null;
  role_in_family: string;
  date_joined: string;
  is_active: boolean;
  family_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  image_url: string;
  is_important: boolean;
  scope: 'global' | 'family';
  family_id: number | null;
  family_name?: string;
  published_at: string;
  author_name?: string;
  author_id: number;
  created_at: string;
  updated_at: string;
}

export interface PrayerRequest {
  id: number;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'addressed' | 'resolved';
  member_id: number;
  member_name?: string;
  member_gender?: string;
  family_name?: string;
  forwarded_to_pastor: boolean;
  forwarded_by: number | null;
  forwarded_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface WorshipLeader {
  id: number;
  name: string;
  role: string;
  profile_photo: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: number;
  url: string;
  caption: string;
  category: string;
  family_id: number | null;
  family_name?: string;
  uploaded_by: number;
  uploaded_by_name?: string;
  created_at: string;
}

export interface FridayCancellation {
  id: number;
  cancellation_date: string;
  reason: string;
  cancelled_by: number;
  cancelled_by_name?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  service_date: string;
  member_id: number;
  family_id: number;
  checked_in_by: number | null;
  status: 'present' | 'late';
  created_at: string;
  member_name?: string;
  gender?: string;
  family_name?: string;
}

export interface AttendanceStats {
  totalMembers: number;
  recentServices: { service_date: string; present_count: number; late_count: number }[];
  totalCheckIns: number;
}

export interface DashboardData {
  stats: {
    totalFamilies: number;
    totalMembers: number;
  };
  recentAnnouncements: Announcement[];
  recentPrayerRequests: PrayerRequest[];
  activeWorshipLeaders: WorshipLeader[];
  recentPhotos: Photo[];
  birthdays: Member[];
  upcomingCancellation: FridayCancellation | null;
  todayAttendance?: { service_date: string; present_count: number };
}
