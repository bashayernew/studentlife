import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, saveDb } from '../lib/localDb';

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  // Simple local profile operations
  const profileOperations = {
    load(userId) {
      if (!userId) return;
      setProfileLoading(true);
      const profile = db.profiles.find(p => p.id === userId) || null;
      setUserProfile(profile);
      setProfileLoading(false);
    },
    clear() {
      setUserProfile(null);
      setProfileLoading(false);
    }
  };

  // On mount, restore user from localStorage (if any)
  useEffect(() => {
    const savedEmail = typeof window !== 'undefined'
      ? window.localStorage.getItem('auth_email')
      : null;
    if (savedEmail) {
      const existingUser = db.users.find(u => u.email === savedEmail) || null;
      if (existingUser) {
        setUser({ id: existingUser.id, email: existingUser.email });
        profileOperations.load(existingUser.id);
        setLoading(false);
        return;
      }
    }
    setLoading(false);
  }, []);

  // Demo mode: purely local, same as real local auth
  const signInDemo = (role = 'admin') => {
    const email = role === 'admin' ? 'admin123123@gmail.com' : 'demo-staff@studentlife.local';
    const existingUser = db.users.find(u => u.email === email);
    if (existingUser) {
      const profile = db.profiles.find(p => p.id === existingUser.id) || null;
      setUser({ id: existingUser.id, email: existingUser.email });
      setUserProfile(profile);
      setLoading(false);
      setProfileLoading(false);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('auth_email', existingUser.email);
      }
      return { data: { user: existingUser }, error: null };
    }
    return { data: null, error: { message: 'Demo user not found' } };
  };

  // Auth methods: simple local check against db.users
  const signIn = async (email, password) => {
    const userRecord = db.users.find(
      u => u.email === email?.trim() && u.password === password
    );
    if (!userRecord) {
      return { data: null, error: { message: 'Invalid email or password' } };
    }
    const profile = db.profiles.find(p => p.id === userRecord.id) || null;
    setUser({ id: userRecord.id, email: userRecord.email });
    setUserProfile(profile);
    setLoading(false);
    setProfileLoading(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('auth_email', userRecord.email);
    }
    return { data: { user: userRecord }, error: null };
  };

  const signOut = async () => {
    setUser(null);
    profileOperations.clear();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('auth_email');
    }
    return { error: null };
  };

  const updateProfile = async (updates) => {
    if (!user) return { error: { message: 'No user logged in' } }
    
    const profile = db.profiles.find(p => p.id === user.id);
    if (!profile) {
      return { data: null, error: { message: 'Profile not found' } };
    }
    Object.assign(profile, updates || {});
    setUserProfile({ ...profile });
    saveDb();
    return { data: profile, error: null };
  }

  const updateEmail = async (newEmail) => {
    if (!user) return { error: { message: 'No user logged in' } };
    const trimmed = newEmail?.trim();
    if (!trimmed) return { error: { message: 'Email is required' } };
    const taken = db.users.some(u => u.id !== user.id && u.email === trimmed);
    if (taken) return { error: { message: 'That email is already in use' } };
    const userRecord = db.users.find(u => u.id === user.id);
    const profile = db.profiles.find(p => p.id === user.id);
    if (!userRecord || !profile) return { error: { message: 'User not found' } };
    userRecord.email = trimmed;
    profile.email = trimmed;
    setUser({ id: user.id, email: trimmed });
    setUserProfile({ ...profile });
    if (typeof window !== 'undefined') window.localStorage.setItem('auth_email', trimmed);
    saveDb();
    return { data: profile, error: null };
  };

  const updatePassword = async (currentPassword, newPassword) => {
    if (!user) return { error: { message: 'No user logged in' } };
    const userRecord = db.users.find(u => u.id === user.id);
    if (!userRecord) return { error: { message: 'User not found' } };
    if (userRecord.password !== currentPassword) return { error: { message: 'Current password is incorrect' } };
    const trimmed = newPassword?.trim();
    if (!trimmed || trimmed.length < 4) return { error: { message: 'New password must be at least 4 characters' } };
    userRecord.password = trimmed;
    saveDb();
    return { error: null };
  };

  const value = {
    user,
    userProfile,
    loading,
    profileLoading,
    signIn,
    signInDemo,
    signOut,
    updateProfile,
    updateEmail,
    updatePassword,
    isAuthenticated: !!user,
    isDemoUser: false
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
