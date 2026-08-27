import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import bcrypt from 'bcryptjs';
import { query } from '../config/database';

export async function seedDatabase() {
  console.log('Seeding database...');

  const existing = await query('SELECT COUNT(*) as count FROM users');
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 12);
  const memberHash = await bcrypt.hash('member123', 12);

  const pastor = await query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'pastor') RETURNING id`,
    ['pastor@bubapc.org', passwordHash, 'Pastor John']
  );

  const coordinator = await query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'family_coordinator') RETURNING id`,
    ['coordinator@bubapc.org', passwordHash, 'Sister Grace']
  );

  const familyLeaderMale = await query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'family_leader') RETURNING id`,
    ['leader.male@bubapc.org', passwordHash, 'Brother Samuel']
  );

  const familyLeaderFemale = await query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'family_leader') RETURNING id`,
    ['leader.female@bubapc.org', passwordHash, 'Sister Martha']
  );

  const memberUser = await query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'member') RETURNING id`,
    ['john.doe@example.com', memberHash, 'John Doe']
  );

  const f1 = await query(
    `INSERT INTO families (name, description, contact_email, leader_male_id, leader_female_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    ['Grace Family', 'A loving family of grace', 'grace@bubapc.org', familyLeaderMale.rows[0].id, familyLeaderFemale.rows[0].id]
  );

  const f2 = await query(
    `INSERT INTO families (name, description, contact_email) VALUES ($1, $2, $3) RETURNING id`,
    ['Faith Family', 'Walking by faith', 'faith@bubapc.org']
  );

  const f3 = await query(
    `INSERT INTO families (name, description, contact_email) VALUES ($1, $2, $3) RETURNING id`,
    ['Hope Family', 'Anchored in hope', 'hope@bubapc.org']
  );

  await query(`INSERT INTO members (user_id, family_id, full_name, email, gender, birthday, role_in_family) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [memberUser.rows[0].id, f1.rows[0].id, 'John Doe', 'john.doe@example.com', 'male', '1990-06-15', 'Member']);

  await query(`INSERT INTO members (family_id, full_name, email, gender, birthday, role_in_family) VALUES ($1, $2, $3, $4, $5, $6)`,
    [f1.rows[0].id, 'Jane Doe', 'jane@example.com', 'female', '1992-03-22', 'Member']);

  await query(`INSERT INTO members (family_id, full_name, email, gender, role_in_family) VALUES ($1, $2, $3, $4, $5)`,
    [f1.rows[0].id, 'Samuel Jr', 'sam@example.com', 'male', 'Member']);

  await query(`INSERT INTO members (family_id, full_name, email, gender, birthday, role_in_family) VALUES ($1, $2, $3, $4, $5, $6)`,
    [f2.rows[0].id, 'Peter Kamau', 'peter@example.com', 'male', '1985-07-04', 'Member']);

  await query(`INSERT INTO members (family_id, full_name, email, gender, role_in_family) VALUES ($1, $2, $3, $4, $5)`,
    [f2.rows[0].id, 'Ruth Kamau', 'ruth@example.com', 'female', 'Member']);

  await query(`INSERT INTO members (family_id, full_name, email, gender, birthday, role_in_family) VALUES ($1, $2, $3, $4, $5, $6)`,
    [f3.rows[0].id, 'David Ochieng', 'david@example.com', 'male', '1988-12-25', 'Member']);

  await query(`INSERT INTO members (family_id, full_name, email, gender, role_in_family) VALUES ($1, $2, $3, $4, $5)`,
    [f3.rows[0].id, 'Esther Ochieng', 'esther@example.com', 'female', 'Member']);

  await query(`INSERT INTO announcements (title, content, is_important, author_id) VALUES ($1, $2, $3, $4)`,
    ['Welcome to BUBAPC Family Connect', 'We are excited to launch our family connection app!', true, pastor.rows[0].id]);

  await query(`INSERT INTO announcements (title, content, author_id) VALUES ($1, $2, $3)`,
    ['Friday Service Update', 'Service times remain 5:00 PM - 6:00 PM every Friday.', coordinator.rows[0].id]);

  await query(`INSERT INTO announcements (title, content, scope, family_id, author_id) VALUES ($1, $2, 'family', $3, $4)`,
    ['Grace Family T-Shirts', 'Please collect your family T-shirts from the leader.', f1.rows[0].id, familyLeaderMale.rows[0].id]);

  const m1 = await query('SELECT id FROM members WHERE email = $1', ['jane@example.com']);
  await query(`INSERT INTO prayer_requests (title, description, category, member_id) VALUES ($1, $2, $3, $4)`,
    ['Healing Prayer', 'Please pray for my mother who is unwell.', 'Health', m1.rows[0].id]);

  const m4 = await query('SELECT id FROM members WHERE email = $1', ['peter@example.com']);
  await query(`INSERT INTO prayer_requests (title, description, category, member_id) VALUES ($1, $2, $3, $4)`,
    ['Job Provision', 'Seeking employment opportunities.', 'Provision', m4.rows[0].id]);

  await query(`INSERT INTO worship_leaders (name, role, is_active) VALUES ($1, $2, true)`,
    ['Mercy Johnson', 'Lead Vocalist']);

  await query(`INSERT INTO worship_leaders (name, role, is_active) VALUES ($1, $2, true)`,
    ['James Okello', 'Guitarist']);

  await query(`INSERT INTO worship_leaders (name, role, is_active) VALUES ($1, $2, true)`,
    ['Sarah Nambuya', 'Keyboardist']);

  console.log('Database seeded successfully');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
