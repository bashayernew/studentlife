import { db, makeId, saveDb, STORAGE_KEY } from '../lib/localDb';

/**
 * Local in-memory \"auth service\" used by admin pages (e.g. StaffManagement).
 * This does NOT talk to Supabase or any remote backend.
 */

export const authService = {
  // Create staff member (admin function). role defaults to 'staff' if not provided.
  // initialPassword: optional; if not provided, default is 'staff123'.
  async createStaffMember(email, fullName, departmentId = null, role = 'staff', initialPassword = 'staff123') {
    const trimmedEmail = email?.trim();
    if (!trimmedEmail || !fullName?.trim()) {
      return { data: null, error: { message: 'Email and full name are required' } };
    }

    // Check against latest persisted data so recreate after delete always works.
    const usersList = (() => {
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage?.getItem?.(STORAGE_KEY) : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.users && Array.isArray(parsed.users)) return parsed.users;
        }
      } catch {}
      return Array.isArray(db.users) ? db.users : [];
    })();
    const existing = usersList.find(
      u => String(u?.email ?? '').toLowerCase().trim() === String(trimmedEmail ?? '').toLowerCase().trim()
    );
    if (existing) {
      return { data: null, error: { message: 'Email already exists' } };
    }

    const roleToUse = (role && role !== 'other') ? String(role).toLowerCase() : 'staff';
    const id = makeId();
    const passwordToUse = (initialPassword && String(initialPassword).trim()) ? String(initialPassword).trim() : 'staff123';
    const user = {
      id,
      email: trimmedEmail,
      password: passwordToUse,
      full_name: fullName.trim(),
      role: roleToUse,
      department_id: departmentId || null,
    };
    const profile = {
      id,
      email: trimmedEmail,
      full_name: fullName.trim(),
      role: roleToUse,
      department_id: departmentId || null,
    };

    db.users.push(user);
    db.profiles.push(profile);
    saveDb();

    return { data: profile, error: null };
  },

  // Update staff role. Accepts any non-empty string (admin, staff, manager, or custom).
  async updateStaffRole(userId, newRole) {
    const roleToUse = newRole && String(newRole).trim() ? String(newRole).trim().toLowerCase() : null;
    if (!roleToUse) {
      return { error: { message: 'Role is required' } };
    }
    const user = db.users.find(u => u.id === userId);
    const profile = db.profiles.find(p => p.id === userId);
    if (!user || !profile) {
      return { error: { message: 'User not found' } };
    }
    user.role = roleToUse;
    profile.role = roleToUse;
    saveDb();
    return { error: null };
  },

  // Delete staff member: remove from users and profiles, and remove their task assignments so the email can be reused.
  async deleteStaffMember(userId) {
    db.users = db.users.filter(u => u.id !== userId || u.role === 'admin');
    db.profiles = db.profiles.filter(p => p.id !== userId || p.role === 'admin');
    if (Array.isArray(db.taskAssignees)) {
      db.taskAssignees = db.taskAssignees.filter(a => a.user_id !== userId);
    }
    saveDb();
    return { error: null };
  },
};

export default authService;
