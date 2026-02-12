// Simple local \"backend\" to replace Supabase.
// Data is kept in memory and also synced to localStorage so it survives reloads
// in this browser (but is not shared across devices or users).

export const STORAGE_KEY = 'student_life_local_db_v1';

const makeId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}`;

const defaultDb = {
  users: [
    {
      id: 'user-admin',
      email: 'admin123123@gmail.com',
      password: 'admin123123', // local-only demo password
      full_name: 'Admin User',
      role: 'admin',
      department_id: null,
    },
  ],
  profiles: [
    {
      id: 'user-admin',
      email: 'admin123123@gmail.com',
      full_name: 'Admin User',
      role: 'admin',
      department_id: null,
    },
  ],
  departments: [
    { id: 'dept-general', name: 'General' },
  ],
  tasks: [],
  taskAssignees: [],
  messages: [],
};

let initialDb = defaultDb;

if (typeof window !== 'undefined') {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        initialDb = { ...defaultDb, ...parsed };
      }
    }
  } catch {
    // ignore corrupt storage and fall back to defaults
  }
}

export const db = initialDb;

export const saveDb = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore quota / storage errors
  }
};

// Reload db from localStorage so duplicate checks and lists use latest data (e.g. after delete in same or other tab).
export const rehydrateDb = () => {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.users)) db.users = parsed.users;
        if (Array.isArray(parsed.profiles)) db.profiles = parsed.profiles;
        if (Array.isArray(parsed.departments)) db.departments = parsed.departments;
        if (Array.isArray(parsed.tasks)) db.tasks = parsed.tasks;
        if (Array.isArray(parsed.taskAssignees)) db.taskAssignees = parsed.taskAssignees;
        if (Array.isArray(parsed.messages)) db.messages = parsed.messages;
      }
    }
  } catch {
    // ignore
  }
};

export { makeId };

