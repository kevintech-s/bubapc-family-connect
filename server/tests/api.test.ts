import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = 'http://localhost:5000/api';

async function apiCall(method: string, path: string, body?: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

describe('Authentication', () => {
  it('should login with valid credentials', async () => {
    const { status, data } = await apiCall('POST', '/auth/login', {
      email: 'admin@bubapc.org',
      password: 'admin123',
    });
    expect(status).toBe(200);
    expect(data.token).toBeDefined();
    expect(data.user.role).toBe('admin');
  });

  it('should reject invalid credentials', async () => {
    const { status } = await apiCall('POST', '/auth/login', {
      email: 'wrong@example.com',
      password: 'wrongpassword',
    });
    expect(status).toBe(401);
  });

  it('should reject login with missing fields', async () => {
    const { status } = await apiCall('POST', '/auth/login', { email: 'test@test.com' });
    expect(status).toBe(400);
  });

  it('should get current user with valid token', async () => {
    const loginRes = await apiCall('POST', '/auth/login', {
      email: 'admin@bubapc.org',
      password: 'admin123',
    });
    const { status, data } = await apiCall('GET', '/auth/me', undefined, loginRes.data.token);
    expect(status).toBe(200);
    expect(data.email).toBe('admin@bubapc.org');
  });

  it('should reject unauthenticated requests', async () => {
    const { status } = await apiCall('GET', '/auth/me');
    expect(status).toBe(401);
  });
});

describe('Authorization', () => {
  let adminToken: string;
  let memberToken: string;

  it('should get admin token', async () => {
    const res = await apiCall('POST', '/auth/login', {
      email: 'admin@bubapc.org',
      password: 'admin123',
    });
    adminToken = res.data.token;
    expect(adminToken).toBeDefined();
  });

  it('should get member token', async () => {
    const res = await apiCall('POST', '/auth/login', {
      email: 'john.doe@example.com',
      password: 'member123',
    });
    memberToken = res.data.token;
    expect(memberToken).toBeDefined();
  });

  it('admin should be able to create families', async () => {
    const { status } = await apiCall('POST', '/families', { name: 'Test Family' }, adminToken);
    expect(status).toBe(201);
  });

  it('member should not be able to create families', async () => {
    const { status } = await apiCall('POST', '/families', { name: 'Unauthorized Family' }, memberToken);
    expect(status).toBe(403);
  });
});

describe('Families CRUD', () => {
  let adminToken: string;
  let familyId: number;

  beforeAll(async () => {
    const res = await apiCall('POST', '/auth/login', {
      email: 'admin@bubapc.org',
      password: 'admin123',
    });
    adminToken = res.data.token;
  });

  it('should list families', async () => {
    const { status, data } = await apiCall('GET', '/families', undefined, adminToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('should create a family', async () => {
    const { status, data } = await apiCall('POST', '/families', {
      name: 'Test Family CRUD',
      description: 'A test family',
    }, adminToken);
    expect(status).toBe(201);
    familyId = data.id;
    expect(data.name).toBe('Test Family CRUD');
  });

  it('should get a family by id', async () => {
    const { status, data } = await apiCall('GET', `/families/${familyId}`, undefined, adminToken);
    expect(status).toBe(200);
    expect(data.name).toBe('Test Family CRUD');
  });

  it('should update a family', async () => {
    const { status, data } = await apiCall('PUT', `/families/${familyId}`, {
      name: 'Updated Test Family',
    }, adminToken);
    expect(status).toBe(200);
    expect(data.name).toBe('Updated Test Family');
  });

  it('should delete a family', async () => {
    const { status } = await apiCall('DELETE', `/families/${familyId}`, undefined, adminToken);
    expect(status).toBe(200);
  });

  it('should return 404 for deleted family', async () => {
    const { status } = await apiCall('GET', `/families/${familyId}`, undefined, adminToken);
    expect(status).toBe(404);
  });
});

describe('Announcements CRUD', () => {
  let adminToken: string;
  let announcementId: number;

  beforeAll(async () => {
    const res = await apiCall('POST', '/auth/login', {
      email: 'admin@bubapc.org',
      password: 'admin123',
    });
    adminToken = res.data.token;
  });

  it('should list announcements', async () => {
    const { status, data } = await apiCall('GET', '/announcements', undefined, adminToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('should create an announcement', async () => {
    const { status, data } = await apiCall('POST', '/announcements', {
      title: 'Test Announcement',
      content: 'This is a test announcement',
      is_important: true,
    }, adminToken);
    expect(status).toBe(201);
    announcementId = data.id;
    expect(data.title).toBe('Test Announcement');
  });

  it('should update an announcement', async () => {
    const { status, data } = await apiCall('PUT', `/announcements/${announcementId}`, {
      title: 'Updated Announcement',
    }, adminToken);
    expect(status).toBe(200);
    expect(data.title).toBe('Updated Announcement');
  });

  it('should delete an announcement', async () => {
    const { status } = await apiCall('DELETE', `/announcements/${announcementId}`, undefined, adminToken);
    expect(status).toBe(200);
  });
});

describe('Prayer Requests', () => {
  let adminToken: string;
  let requestId: number;

  beforeAll(async () => {
    const res = await apiCall('POST', '/auth/login', {
      email: 'admin@bubapc.org',
      password: 'admin123',
    });
    adminToken = res.data.token;
  });

  it('should list prayer requests', async () => {
    const { status, data } = await apiCall('GET', '/prayer-requests', undefined, adminToken);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('should create a prayer request', async () => {
    const { status, data } = await apiCall('POST', '/prayer-requests', {
      title: 'Test Prayer',
      description: 'Please pray for testing',
      category: 'General',
    }, adminToken);
    expect(status).toBe(201);
    requestId = data.id;
    expect(data.status).toBe('pending');
  });

  it('should update prayer request status', async () => {
    const { status, data } = await apiCall('PUT', `/prayer-requests/${requestId}`, {
      status: 'addressed',
    }, adminToken);
    expect(status).toBe(200);
    expect(data.status).toBe('addressed');
  });

  it('should delete a prayer request', async () => {
    const { status } = await apiCall('DELETE', `/prayer-requests/${requestId}`, undefined, adminToken);
    expect(status).toBe(200);
  });
});

describe('API Validation', () => {
  let adminToken: string;

  beforeAll(async () => {
    const res = await apiCall('POST', '/auth/login', {
      email: 'admin@bubapc.org',
      password: 'admin123',
    });
    adminToken = res.data.token;
  });

  it('should reject creating family without name', async () => {
    const { status } = await apiCall('POST', '/families', {}, adminToken);
    expect(status).toBe(400);
  });

  it('should reject creating announcement without title', async () => {
    const { status } = await apiCall('POST', '/announcements', { content: 'test' }, adminToken);
    expect(status).toBe(400);
  });

  it('should reject creating prayer request without title', async () => {
    const { status } = await apiCall('POST', '/prayer-requests', { description: 'test' }, adminToken);
    expect(status).toBe(400);
  });
});
