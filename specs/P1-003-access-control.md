# P1-003: User Access Control & Permissions

**Status**: 🔴 Not Started
**Priority**: Critical | **Effort**: High | **Impact**: Critical
**Estimated Hours**: 80-120 hours

---

## Overview

Implement a comprehensive role-based access control (RBAC) system with document-level permissions to ensure data security, privacy, and proper access management across departments and team members.

---

## Business Requirements

### Current State
- No user authentication
- All data visible to everyone
- No document confidentiality
- Single-user deployment assumption

### Desired State
- Multi-user authentication system
- Role-based access control (Admin, Manager, Viewer, etc.)
- Document-level permissions (private, department-only, public)
- Department-based data segmentation
- Audit logging for sensitive operations
- Individual user workspaces

### Use Cases

1. **Confidential Documents**: Marketing director uploads confidential strategy document visible only to leadership
2. **Department Isolation**: Basketball team KPIs not visible to hockey staff
3. **Executive Access**: Athletic Director can view all departments
4. **Staff Limited Access**: Individual contributors see only their assigned work
5. **External Stakeholders**: Board members have read-only access to reports

---

## Technical Specification

### Database Schema

#### New Tables

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  department_id UUID REFERENCES departments(id),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  parent_department_id UUID REFERENCES departments(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles table (predefined roles)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User roles junction table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  scope VARCHAR(50) DEFAULT 'global', -- 'global', 'department', 'document'
  scope_id UUID, -- department_id or document_id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role_id, scope, scope_id)
);

-- Document permissions
CREATE TABLE document_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  permission_type VARCHAR(20) NOT NULL, -- 'public', 'private', 'department', 'specific_users'
  allowed_department_id UUID REFERENCES departments(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document user access (for specific_users type)
CREATE TABLE document_user_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_level VARCHAR(20) NOT NULL, -- 'read', 'write', 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, user_id)
);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL, -- 'document', 'kpi', 'ogsm', etc.
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session management
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add user tracking to existing tables
ALTER TABLE documents ADD COLUMN owner_id UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN department_id UUID REFERENCES departments(id);

ALTER TABLE kpis ADD COLUMN owner_id UUID REFERENCES users(id);
ALTER TABLE kpis ADD COLUMN department_id UUID REFERENCES departments(id);

ALTER TABLE ogsm_components ADD COLUMN owner_id UUID REFERENCES users(id);
ALTER TABLE ogsm_components ADD COLUMN department_id UUID REFERENCES departments(id);
```

#### Predefined Roles

```typescript
const defaultRoles = [
  {
    name: 'Super Admin',
    description: 'Full system access',
    permissions: {
      documents: ['create', 'read', 'update', 'delete', 'manage_permissions'],
      kpis: ['create', 'read', 'update', 'delete'],
      ogsm: ['create', 'read', 'update', 'delete'],
      users: ['create', 'read', 'update', 'delete', 'manage_roles'],
      departments: ['create', 'read', 'update', 'delete'],
      reports: ['create', 'read', 'export'],
      ai: ['chat', 'generate', 'analyze']
    }
  },
  {
    name: 'Athletic Director',
    description: 'Cross-department leadership access',
    permissions: {
      documents: ['create', 'read', 'update', 'delete'],
      kpis: ['create', 'read', 'update', 'delete'],
      ogsm: ['create', 'read', 'update', 'delete'],
      users: ['read'],
      departments: ['read'],
      reports: ['create', 'read', 'export'],
      ai: ['chat', 'generate', 'analyze']
    }
  },
  {
    name: 'Department Manager',
    description: 'Full access within own department',
    permissions: {
      documents: ['create', 'read', 'update', 'delete'],
      kpis: ['create', 'read', 'update', 'delete'],
      ogsm: ['create', 'read', 'update', 'delete'],
      users: ['read'],
      departments: ['read'],
      reports: ['create', 'read', 'export'],
      ai: ['chat', 'generate', 'analyze']
    }
  },
  {
    name: 'Staff Member',
    description: 'Standard access to assigned work',
    permissions: {
      documents: ['create', 'read', 'update'],
      kpis: ['read', 'update'],
      ogsm: ['read'],
      reports: ['read'],
      ai: ['chat']
    }
  },
  {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: {
      documents: ['read'],
      kpis: ['read'],
      ogsm: ['read'],
      reports: ['read'],
      ai: []
    }
  }
];
```

---

### Backend Changes

#### New Files

**File: `backend/src/middleware/auth.ts`**
```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
    department_id: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Fetch user and roles from database
    const user = await db.getUserWithRoles(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (resource: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasPermission = checkPermission(req.user.roles, resource, action);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

function checkPermission(roles: any[], resource: string, action: string): boolean {
  // Check if any role has the required permission
  return roles.some(role =>
    role.permissions[resource]?.includes(action)
  );
}
```

**File: `backend/src/middleware/departmentAccess.ts`**
```typescript
export const checkDepartmentAccess = (resourceType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const resourceId = req.params.id;
    const user = req.user!;

    // Super admins bypass department checks
    if (isSuperAdmin(user.roles)) {
      return next();
    }

    // Fetch resource and check department
    const resource = await db.getResource(resourceType, resourceId);

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Athletic Directors can access all departments
    if (isAthleticDirector(user.roles)) {
      return next();
    }

    // Department managers/staff can only access their department
    if (resource.department_id !== user.department_id) {
      return res.status(403).json({ error: 'Access denied to this department' });
    }

    next();
  };
};
```

**File: `backend/src/routes/auth.ts`**
```typescript
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, first_name, last_name, department_id } = req.body;

  // Hash password
  const password_hash = await bcrypt.hash(password, 10);

  // Create user
  const user = await db.createUser({
    email,
    password_hash,
    first_name,
    last_name,
    department_id
  });

  // Assign default role (Staff Member)
  await db.assignRole(user.id, 'Staff Member');

  res.status(201).json({ id: user.id, email: user.email });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await db.getUserByEmail(email);

  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);

  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  // Log audit
  await db.auditLog({
    user_id: user.id,
    action: 'login',
    resource_type: 'auth',
    ip_address: req.ip
  });

  // Update last login
  await db.updateUserLastLogin(user.id);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      department_id: user.department_id
    }
  });
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  // Invalidate token (if using token blacklist)
  await db.auditLog({
    user_id: req.user!.id,
    action: 'logout',
    resource_type: 'auth',
    ip_address: req.ip
  });

  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = await db.getUserWithRolesAndPermissions(req.user!.id);
  res.json(user);
});

export default router;
```

**File: `backend/src/routes/users.ts`**
```typescript
import express from 'express';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// GET /api/users
router.get('/', authenticate, authorize('users', 'read'), async (req, res) => {
  const users = await db.getUsers();
  res.json(users);
});

// POST /api/users/:id/roles
router.post('/:id/roles', authenticate, authorize('users', 'manage_roles'), async (req, res) => {
  const { role_id, scope, scope_id } = req.body;
  await db.assignRole(req.params.id, role_id, scope, scope_id);
  res.json({ message: 'Role assigned successfully' });
});

// GET /api/users/:id/permissions
router.get('/:id/permissions', authenticate, async (req, res) => {
  const permissions = await db.getUserPermissions(req.params.id);
  res.json(permissions);
});

export default router;
```

**File: `backend/src/routes/departments.ts`**
```typescript
import express from 'express';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// GET /api/departments
router.get('/', authenticate, async (req, res) => {
  const departments = await db.getDepartments();
  res.json(departments);
});

// POST /api/departments
router.post('/', authenticate, authorize('departments', 'create'), async (req, res) => {
  const { name, description, parent_department_id } = req.body;
  const department = await db.createDepartment({ name, description, parent_department_id });
  res.status(201).json(department);
});

export default router;
```

#### Update Existing Routes

**File: `backend/src/routes/documents.ts`**
```typescript
// Add authentication and authorization
router.post('/', authenticate, authorize('documents', 'create'), async (req, res) => {
  const { permission_type, allowed_department_id, allowed_user_ids } = req.body;

  // Create document with owner
  const document = await db.createDocument({
    ...req.body,
    owner_id: req.user!.id,
    department_id: req.user!.department_id
  });

  // Set permissions
  await db.setDocumentPermissions(document.id, {
    permission_type,
    allowed_department_id,
    allowed_user_ids
  });

  res.status(201).json(document);
});

// Add document access check
router.get('/:id', authenticate, async (req, res) => {
  const hasAccess = await db.checkDocumentAccess(req.params.id, req.user!.id);

  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const document = await db.getDocument(req.params.id);
  res.json(document);
});
```

**File: `backend/src/routes/kpis.ts`**
```typescript
// Add department filtering
router.get('/', authenticate, async (req, res) => {
  const user = req.user!;

  let kpis;
  if (isSuperAdmin(user.roles) || isAthleticDirector(user.roles)) {
    // Can see all KPIs
    kpis = await db.getKPIs();
  } else {
    // Only see own department KPIs
    kpis = await db.getKPIsByDepartment(user.department_id);
  }

  res.json(kpis);
});

// Add department assignment on create
router.post('/', authenticate, authorize('kpis', 'create'), async (req, res) => {
  const kpi = await db.createKPI({
    ...req.body,
    owner_id: req.user!.id,
    department_id: req.user!.department_id
  });

  res.status(201).json(kpi);
});
```

---

### Frontend Changes

#### New Files

**File: `frontend/src/contexts/AuthContext.tsx`**
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department_id: string;
  roles: Role[];
  permissions: Permissions;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('auth_token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await api.get('/auth/me');
      setUser(userData);
    } catch (error) {
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('auth_token', response.token);
    setUser(response.user);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    return user.permissions[resource]?.includes(action) || false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

**File: `frontend/src/pages/Login.tsx`**
```tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Login to Stratify AI</h2>
        {error && <div className="error">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};
```

**File: `frontend/src/components/ProtectedRoute.tsx`**
```tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: { resource: string; action: string };
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission
}) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredPermission && !hasPermission(requiredPermission.resource, requiredPermission.action)) {
    return <div>Access Denied</div>;
  }

  return <>{children}</>;
};
```

#### Update Existing Files

**File: `frontend/src/App.tsx`**
```tsx
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="documents" element={<Documents />} />
            {/* ... other routes */}
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

**File: `frontend/src/lib/api.ts`**
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Add auth token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = apiClient;
```

---

## Environment Variables

Add to `.env`:
```bash
JWT_SECRET=your-secret-key-here-min-32-chars
JWT_EXPIRATION=7d
BCRYPT_ROUNDS=10
```

---

## Testing Requirements

### Unit Tests
- [ ] Password hashing and validation
- [ ] JWT token generation and verification
- [ ] Permission checking logic
- [ ] Department access validation

### Integration Tests
- [ ] User registration and login flow
- [ ] Role assignment and permission checks
- [ ] Document permission enforcement
- [ ] Department-based data filtering
- [ ] Audit log creation

### Security Tests
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting on auth endpoints
- [ ] Password strength requirements
- [ ] Token expiration and refresh

### Manual Testing
- [ ] Create user with different roles
- [ ] Test document permissions (private, department, public)
- [ ] Verify department isolation
- [ ] Test role-based feature visibility
- [ ] Audit log verification

---

## Migration Strategy

### Phase 1: Database Setup
1. Create new tables
2. Seed default roles and departments
3. Create initial admin user

### Phase 2: Backend Implementation
1. Deploy authentication system
2. Add middleware to existing routes
3. Update APIs to include ownership

### Phase 3: Frontend Implementation
1. Add login page and auth context
2. Protect all routes
3. Update components with permission checks

### Phase 4: Data Migration
1. Assign existing data to departments
2. Set document permissions (default to public initially)
3. Create user accounts for existing team members

---

## Security Considerations

1. **Password Security**
   - Minimum 8 characters, complexity requirements
   - Bcrypt with 10+ rounds
   - No password in API responses

2. **Token Security**
   - HTTP-only cookies for token storage (consider over localStorage)
   - Short expiration with refresh token strategy
   - Token rotation on sensitive operations

3. **API Security**
   - Rate limiting on auth endpoints
   - CORS configuration
   - Input validation and sanitization

4. **Audit Logging**
   - Log all authentication events
   - Log sensitive data access
   - Log permission changes

5. **Session Management**
   - Automatic logout on inactivity
   - Concurrent session limits
   - Session invalidation on password change

---

## Success Criteria

- [ ] User registration and login functional
- [ ] Role-based access control enforced
- [ ] Document permissions working correctly
- [ ] Department data isolation verified
- [ ] Audit logging operational
- [ ] All security tests passing
- [ ] No unauthorized access possible
- [ ] Performance acceptable with auth overhead

---

## Future Enhancements

- Two-factor authentication (2FA)
- Single Sign-On (SSO) integration
- OAuth2 support
- Advanced audit analytics
- User activity dashboards
- Permission inheritance for nested departments
- Temporary access grants with expiration
