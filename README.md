# BUBAPC Family Connect

A private family/community management platform designed to connect and organize families within BUBAPC.

## Features

- **Family Management** - Create, view, and manage family profiles
- **Member Directory** - Browse and manage community members
- **Announcements** - Publish and view community announcements with priority marking
- **Prayer Requests** - Submit and manage prayer requests with categories and status tracking
- **Worship Leaders** - Manage current worship team members
- **Photo Gallery** - Upload, categorize, and browse community photos
- **Role-based Access** - Admin and member roles with proper authorization
- **Responsive Design** - Works on phones, tablets, and desktops

## Technology Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router v6
- Axios
- React Hot Toast

### Backend
- Node.js + Express + TypeScript
- PostgreSQL
- bcryptjs (password hashing)
- JSON Web Tokens (authentication)
- Multer (file uploads)

## Requirements

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Installation

### 1. Clone and install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure environment

```bash
# Copy the example env file
cp .env.example server/.env

# Edit server/.env with your database credentials
```

Required environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | bubapc_family_connect |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | Secret for JWT signing | - |
| `JWT_EXPIRES_IN` | Token expiration | 7d |

### 3. Create the database

```sql
CREATE DATABASE bubapc_family_connect;
```

Or using psql:

```bash
psql -U postgres -c "CREATE DATABASE bubapc_family_connect;"
```

### 4. Run migrations

```bash
cd server
npm run migrate
```

### 5. Seed the database

```bash
cd server
npm run seed
```

This creates:
- Default admin account: `admin@bubapc.org` / `admin123`
- Sample member account: `john.doe@example.com` / `member123`
- 11 sample families
- Sample announcements, worship leaders, and prayer requests

### 6. Start development servers

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Development Commands

### Server

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run migrate      # Run database migrations
npm run seed         # Seed the database
npm run test         # Run tests
```

### Client

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (auth required)
- `PUT /api/auth/profile` - Update profile (auth required)

### Families
- `GET /api/families` - List all families
- `GET /api/families/:id` - Get family with members
- `POST /api/families` - Create family (admin)
- `PUT /api/families/:id` - Update family (admin)
- `DELETE /api/families/:id` - Delete family (admin)

### Members
- `GET /api/members` - List all members
- `GET /api/members/:id` - Get member
- `POST /api/members` - Create member (admin)
- `PUT /api/members/:id` - Update member (admin)
- `DELETE /api/members/:id` - Delete member (admin)

### Announcements
- `GET /api/announcements` - List announcements
- `GET /api/announcements/:id` - Get announcement
- `POST /api/announcements` - Create announcement (admin)
- `PUT /api/announcements/:id` - Update announcement (admin)
- `DELETE /api/announcements/:id` - Delete announcement (admin)

### Prayer Requests
- `GET /api/prayer-requests` - List prayer requests
- `POST /api/prayer-requests` - Submit prayer request (auth required)
- `PUT /api/prayer-requests/:id` - Update status (admin)
- `DELETE /api/prayer-requests/:id` - Delete request (admin)

### Worship Leaders
- `GET /api/worship-leaders` - List worship leaders
- `POST /api/worship-leaders` - Add leader (admin)
- `PUT /api/worship-leaders/:id` - Update leader (admin)
- `DELETE /api/worship-leaders/:id` - Remove leader (admin)

### Photos
- `GET /api/photos` - List photos
- `POST /api/photos` - Upload photo (admin)
- `DELETE /api/photos/:id` - Delete photo (admin)

### Dashboard
- `GET /api/dashboard` - Get dashboard stats (auth required)

## Database Schema

```
users           - User accounts with authentication
families        - Family groups
members         - Individual members linked to families
announcements   - Community announcements
prayer_requests - Prayer request submissions
worship_leaders - Worship team members
photos          - Gallery photos
```

## Default Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@bubapc.org | admin123 | Administrator |
| john.doe@example.com | member123 | Member |

## Production Build

```bash
# Build frontend
cd client
npm run build

# Build backend
cd ../server
npm run build

# Start production server
npm run start
```

## Deployment

1. Set `NODE_ENV=production` in server environment
2. Build both client and server
3. Serve the client build files from the Express server or a CDN
4. Configure PostgreSQL in production
5. Set secure `JWT_SECRET`
6. Configure CORS for your production domain
7. Use a process manager like PM2 for the server

## License

Private - BUBAPC Community
