import React, { createContext, useContext, useState } from 'react';

const USERS_STORAGE_KEY = 'skuevolve_users';
const SESSION_STORAGE_KEY = 'skuevolve_session';

const DEFAULT_USERS = [
  {
    id: 'u-op-ex',
    name: 'Amal Perera',
    email: 'amal.perera@skuevolve.com',
    password: 'amal123',
    role: 'op_ex',
  },
  {
    id: 'u-planner',
    name: 'Kavindu Vihanga',
    email: 'kavindu.vihanga@skuevolve.com',
    password: 'kavindu123',
    role: 'planner',
  },
  {
    id: 'u-manager',
    name: 'Azeem Rashard',
    email: 'azeem.rashard@skuevolve.com',
    password: 'azeem123',
    role: 'manager',
  },
  {
    id: 'u-admin',
    name: 'Mohomed Amir',
    email: 'mohomed.amir@skuevolve.com',
    password: 'admin123',
    role: 'admin',
  },
];

const ROLE_LABELS = {
  op_ex: 'Operations Executive',
  planner: 'Campaign Planner',
  manager: 'Campaign Manager',
  admin: 'Admin',
};

const ROLE_PERMISSIONS = {
  op_ex: {
    canUseScenarioSimulator: false,
    canLaunchCampaign: false,
    canDeleteCampaign: false,
    canClickInterventions: false,
    canManageUsers: false,
  },
  planner: {
    canUseScenarioSimulator: true,
    canLaunchCampaign: false,
    canDeleteCampaign: false,
    canClickInterventions: true,
    canManageUsers: false,
  },
  manager: {
    canUseScenarioSimulator: true,
    canLaunchCampaign: true,
    canDeleteCampaign: true,
    canClickInterventions: true,
    canManageUsers: false,
  },
  admin: {
    canUseScenarioSimulator: true,
    canLaunchCampaign: true,
    canDeleteCampaign: true,
    canClickInterventions: true,
    canManageUsers: true,
  },
};

const AuthContext = createContext(null);

const loadUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return parsed;
  } catch {
    return DEFAULT_USERS;
  }
};

const loadSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState(loadUsers);
  const [currentUser, setCurrentUser] = useState(loadSession);

  const persistUsers = (nextUsers) => {
    setUsers(nextUsers);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers));
  };

  const login = (email, password) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const match = users.find(
      (user) => user.email.toLowerCase() === normalizedEmail && user.password === password
    );
    if (!match) return { ok: false, error: 'Invalid email or password.' };

    const sessionUser = {
      id: match.id,
      name: match.name,
      email: match.email,
      role: match.role,
    };
    setCurrentUser(sessionUser);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    return { ok: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const permissions = ROLE_PERMISSIONS[currentUser?.role] || ROLE_PERMISSIONS.op_ex;

  const createUser = (payload) => {
    if (!permissions.canManageUsers) return { ok: false, error: 'Not authorized.' };

    const name = String(payload?.name || '').trim();
    const email = String(payload?.email || '').trim().toLowerCase();
    const password = String(payload?.password || '').trim();
    const role = String(payload?.role || '').trim();

    if (!name || !email || !password || !ROLE_LABELS[role]) {
      return { ok: false, error: 'Please complete all required fields.' };
    }

    const exists = users.some((user) => user.email.toLowerCase() === email);
    if (exists) return { ok: false, error: 'A user with this email already exists.' };

    const nextUser = {
      id: `u-${Date.now()}`,
      name,
      email,
      password,
      role,
    };

    const nextUsers = [...users, nextUser];
    persistUsers(nextUsers);
    return { ok: true };
  };

  const updateUser = (userId, payload) => {
    if (!permissions.canManageUsers) return { ok: false, error: 'Not authorized.' };

    const name = String(payload?.name || '').trim();
    const email = String(payload?.email || '').trim().toLowerCase();
    const password = String(payload?.password || '').trim();
    const role = String(payload?.role || '').trim();

    if (!name || !email || !ROLE_LABELS[role]) {
      return { ok: false, error: 'Please complete all required fields.' };
    }

    const duplicate = users.some(
      (user) => user.id !== userId && user.email.toLowerCase() === email
    );
    if (duplicate) return { ok: false, error: 'Another user already uses this email.' };

    const nextUsers = users.map((user) => {
      if (user.id !== userId) return user;
      return {
        ...user,
        name,
        email,
        role,
        password: password || user.password,
      };
    });

    persistUsers(nextUsers);

    if (currentUser?.id === userId) {
      const updatedSelf = nextUsers.find((user) => user.id === userId);
      const nextSession = {
        id: updatedSelf.id,
        name: updatedSelf.name,
        email: updatedSelf.email,
        role: updatedSelf.role,
      };
      setCurrentUser(nextSession);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    }

    return { ok: true };
  };

  const deleteUser = (userId) => {
    if (!permissions.canManageUsers) return { ok: false, error: 'Not authorized.' };
    if (currentUser?.id === userId) {
      return { ok: false, error: 'You cannot delete your own account.' };
    }

    const nextUsers = users.filter((user) => user.id !== userId);
    persistUsers(nextUsers.length ? nextUsers : DEFAULT_USERS);
    return { ok: true };
  };

  const value = {
    currentUser,
    users,
    login,
    logout,
    permissions,
    createUser,
    updateUser,
    deleteUser,
    roleLabels: ROLE_LABELS,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
