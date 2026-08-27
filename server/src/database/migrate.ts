import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { query } from '../config/database';

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'family_leader', 'family_coordinator', 'pastor')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    contact_email VARCHAR(255) DEFAULT '',
    contact_phone VARCHAR(50) DEFAULT '',
    address TEXT DEFAULT '',
    photo_url VARCHAR(500) DEFAULT '',
    leader_male_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    leader_female_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT '',
    profile_photo VARCHAR(500) DEFAULT '',
    gender VARCHAR(10) DEFAULT '' CHECK (gender IN ('', 'male', 'female')),
    birthday DATE,
    role_in_family VARCHAR(100) DEFAULT 'Member',
    date_joined DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(500) DEFAULT '',
    is_important BOOLEAN DEFAULT false,
    scope VARCHAR(30) DEFAULT 'global' CHECK (scope IN ('global', 'family')),
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS prayer_requests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'addressed', 'resolved')),
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    forwarded_to_pastor BOOLEAN DEFAULT false,
    forwarded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS worship_leaders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'Worship Leader',
    profile_photo VARCHAR(500) DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    url VARCHAR(500) NOT NULL,
    caption VARCHAR(500) DEFAULT '',
    category VARCHAR(100) DEFAULT 'General',
    family_id INTEGER REFERENCES families(id) ON DELETE SET NULL,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS friday_cancellations (
    id SERIAL PRIMARY KEY,
    cancellation_date DATE NOT NULL,
    reason TEXT NOT NULL,
    cancelled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    service_date DATE NOT NULL,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE NOT NULL,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    checked_in_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'late')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_date, member_id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_members_family ON members(family_id)`,
  `CREATE INDEX IF NOT EXISTS idx_members_user ON members(user_id)`,

  `ALTER TABLE members ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT '' CHECK (gender IN ('', 'male', 'female'))`,
  `ALTER TABLE members ADD COLUMN IF NOT EXISTS birthday DATE`,
  `ALTER TABLE families ADD COLUMN IF NOT EXISTS leader_male_id INTEGER REFERENCES users(id) ON DELETE SET NULL`,
  `ALTER TABLE families ADD COLUMN IF NOT EXISTS leader_female_id INTEGER REFERENCES users(id) ON DELETE SET NULL`,
  `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scope VARCHAR(30) DEFAULT 'global' CHECK (scope IN ('global', 'family'))`,
  `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE CASCADE`,
  `ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS forwarded_to_pastor BOOLEAN DEFAULT false`,
  `ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS forwarded_by INTEGER REFERENCES users(id) ON DELETE SET NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'family_leader', 'family_coordinator', 'pastor'))`,
  `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`,
  `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('member', 'family_leader', 'family_coordinator', 'pastor'))`,
  `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'late'))`,
  `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE CASCADE`,
  `ALTER TABLE photos ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE SET NULL`,

  `CREATE INDEX IF NOT EXISTS idx_members_gender ON members(gender)`,
  `CREATE INDEX IF NOT EXISTS idx_members_birthday ON members(birthday)`,
  `CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_announcements_scope ON announcements(scope)`,
  `CREATE INDEX IF NOT EXISTS idx_prayer_requests_member ON prayer_requests(member_id)`,
  `CREATE INDEX IF NOT EXISTS idx_prayer_requests_status ON prayer_requests(status)`,
  `CREATE INDEX IF NOT EXISTS idx_prayer_requests_forwarded ON prayer_requests(forwarded_to_pastor)`,
  `CREATE INDEX IF NOT EXISTS idx_worship_leaders_active ON worship_leaders(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category)`,
  `CREATE INDEX IF NOT EXISTS idx_photos_family ON photos(family_id)`,
  `CREATE INDEX IF NOT EXISTS idx_friday_cancellations_date ON friday_cancellations(cancellation_date)`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(service_date)`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_family ON attendance(family_id)`,
];

export async function runMigrations() {
  console.log('Running migrations...');
  for (let i = 0; i < migrations.length; i++) {
    try {
      await query(migrations[i]);
      console.log(`Migration ${i + 1}/${migrations.length} completed`);
    } catch (error: any) {
      console.error(`Migration ${i + 1} failed:`, error.message);
      throw error;
    }
  }
  console.log('All migrations completed successfully');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
