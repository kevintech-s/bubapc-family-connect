export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'member';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Family {
  id: number;
  name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  photo_url: string;
  created_at: Date;
  updated_at: Date;
}

export interface Member {
  id: number;
  user_id: number;
  family_id: number;
  full_name: string;
  email: string;
  phone: string;
  profile_photo: string;
  role_in_family: string;
  date_joined: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  image_url: string;
  is_important: boolean;
  published_at: Date;
  author_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface PrayerRequest {
  id: number;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'addressed' | 'resolved';
  member_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface WorshipLeader {
  id: number;
  name: string;
  role: string;
  profile_photo: string;
  is_active: boolean;
  start_date: Date;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Photo {
  id: number;
  url: string;
  caption: string;
  category: string;
  uploaded_by: number;
  created_at: Date;
}
