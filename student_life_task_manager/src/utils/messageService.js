import { db, makeId, saveDb, rehydrateDb } from '../lib/localDb';

function getAdminId() {
  const admin = db.users.find(u => u.role === 'admin');
  return admin?.id ?? null;
}

export const messageService = {
  getAdminId,

  getConversation(userId1, userId2) {
    rehydrateDb();
    const ids = [userId1, userId2].filter(Boolean);
    if (ids.length !== 2) return [];
    const list = (db.messages || []).filter(
      m => ids.includes(m.from_user_id) && ids.includes(m.to_user_id)
    );
    return list.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  sendMessage(fromUserId, toUserId, body, taskId = null) {
    const trimmed = (body || '').trim();
    if (!trimmed || !fromUserId || !toUserId) {
      return { data: null, error: { message: 'Message text and both users are required' } };
    }
    const msg = {
      id: makeId(),
      from_user_id: fromUserId,
      to_user_id: toUserId,
      body: trimmed,
      created_at: new Date().toISOString(),
      task_id: taskId || undefined,
    };
    db.messages = db.messages || [];
    db.messages.push(msg);
    saveDb();
    return { data: msg, error: null };
  },

  getAdminConversations() {
    rehydrateDb();
    const adminId = getAdminId();
    if (!adminId) return { data: [], error: null };
    const messages = db.messages || [];
    const otherIds = new Set();
    messages.forEach(m => {
      if (m.from_user_id === adminId) otherIds.add(m.to_user_id);
      if (m.to_user_id === adminId) otherIds.add(m.from_user_id);
    });
    const profiles = db.profiles || [];
    const list = Array.from(otherIds).map(userId => {
      const profile = profiles.find(p => p.id === userId);
      const lastMsg = messages
        .filter(m => (m.from_user_id === adminId && m.to_user_id === userId) || (m.to_user_id === adminId && m.from_user_id === userId))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      return {
        userId,
        full_name: profile?.full_name ?? 'Unknown',
        email: profile?.email ?? '',
        lastMessage: lastMsg?.body,
        lastAt: lastMsg?.created_at,
      };
    });
    list.sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0));
    return { data: list, error: null };
  },
};

export default messageService;
