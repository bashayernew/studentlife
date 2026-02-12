import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/AppIcon';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Header from '../components/ui/Header';

const MAX_AVATAR_SIZE = 200;
const AVATAR_QUALITY = 0.85;

function resizeImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX_AVATAR_SIZE || h > MAX_AVATAR_SIZE) {
        if (w > h) {
          h = (h / w) * MAX_AVATAR_SIZE;
          w = MAX_AVATAR_SIZE;
        } else {
          w = (w / h) * MAX_AVATAR_SIZE;
          h = MAX_AVATAR_SIZE;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL('image/jpeg', AVATAR_QUALITY));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

const Account = () => {
  const { user, userProfile, updateProfile, updateEmail, updatePassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [emailValue, setEmailValue] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setEmailValue(user?.email || '');
  }, [isAuthenticated, user?.email, navigate]);

  const handleChangeEmail = async (e) => {
    e?.preventDefault();
    setEmailError('');
    setEmailSuccess(false);
    if (!emailValue?.trim()) {
      setEmailError('Email is required');
      return;
    }
    setEmailLoading(true);
    const { error } = await updateEmail(emailValue.trim());
    setEmailLoading(false);
    if (error) {
      setEmailError(error.message || 'Failed to update email');
      return;
    }
    setEmailSuccess(true);
  };

  const handleChangePassword = async (e) => {
    e?.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (!currentPassword) {
      setPasswordError('Enter your current password');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }
    setPasswordLoading(true);
    const { error } = await updatePassword(currentPassword, newPassword);
    setPasswordLoading(false);
    if (error) {
      setPasswordError(error.message || 'Failed to update password');
      return;
    }
    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleAvatarChange = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file (e.g. JPG, PNG).');
      return;
    }
    setAvatarError('');
    setAvatarLoading(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const { error } = await updateProfile({ avatar_url: dataUrl });
      if (error) {
        setAvatarError(error.message || 'Failed to save photo');
      }
    } catch (err) {
      setAvatarError(err?.message || 'Failed to process image');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError('');
    setAvatarLoading(true);
    const { error } = await updateProfile({ avatar_url: null });
    setAvatarLoading(false);
    if (error) setAvatarError(error.message || 'Failed to remove photo');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Account</h1>
        <p className="text-muted-foreground mb-6">
          Signed in as <strong>{userProfile?.full_name || user?.email}</strong>. Update your profile, email, or password below.
        </p>

        {/* Profile image */}
        <section className="mb-8 p-6 bg-card border border-border rounded-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Profile image</h2>
          <div className="flex flex-wrap items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center shrink-0">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Icon name="User" size={40} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
              >
                {avatarLoading ? 'Uploading...' : userProfile?.avatar_url ? 'Change photo' : 'Add photo'}
              </Button>
              {userProfile?.avatar_url && (
                <Button type="button" variant="ghost" onClick={handleRemoveAvatar} disabled={avatarLoading} className="text-muted-foreground">
                  Remove photo
                </Button>
              )}
            </div>
          </div>
          {avatarError && (
            <p className="text-sm text-error flex items-center gap-2 mt-3">
              <Icon name="AlertTriangle" size={14} />
              {avatarError}
            </p>
          )}
        </section>

        {/* Change Email */}
        <section className="mb-8 p-6 bg-card border border-border rounded-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Change email</h2>
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <Input
              type="email"
              name="email"
              placeholder="Email address"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              disabled={emailLoading}
              className="w-full"
            />
            {emailError && (
              <p className="text-sm text-error flex items-center gap-2">
                <Icon name="AlertTriangle" size={14} />
                {emailError}
              </p>
            )}
            {emailSuccess && (
              <p className="text-sm text-success">Email updated successfully.</p>
            )}
            <Button type="submit" disabled={emailLoading}>
              {emailLoading ? 'Saving...' : 'Save email'}
            </Button>
          </form>
        </section>

        {/* Change Password */}
        <section className="p-6 bg-card border border-border rounded-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Change password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              type="password"
              name="currentPassword"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={passwordLoading}
              className="w-full"
            />
            <Input
              type="password"
              name="newPassword"
              placeholder="New password (min 4 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={passwordLoading}
              className="w-full"
            />
            <Input
              type="password"
              name="confirmPassword"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={passwordLoading}
              className="w-full"
            />
            {passwordError && (
              <p className="text-sm text-error flex items-center gap-2">
                <Icon name="AlertTriangle" size={14} />
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-success">Password updated successfully.</p>
            )}
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? 'Saving...' : 'Save password'}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default Account;
