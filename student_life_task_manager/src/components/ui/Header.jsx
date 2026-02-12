import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';

const Header = () => {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isAdmin = userProfile?.role === 'admin';
  const isManager = userProfile?.role === 'manager' || userProfile?.role === 'admin';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img
              src="/assets/images/ktech-logo.png"
              alt="ktech"
              className="h-8 object-contain"
            />
          </div>

          {/* Navigation */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {isAdmin && (
                <Button
                  variant="ghost"
                  onClick={() => handleNavigation('/admin-task-management')}
                  className="flex items-center space-x-2"
                >
                  <Icon name="Settings" size={16} />
                  <span>Admin Dashboard</span>
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={() => handleNavigation('/staff-dashboard')}
                className="flex items-center space-x-2"
              >
                <Icon name="User" size={16} />
                <span>My Tasks</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleNavigation('/account')}
                className="flex items-center space-x-2"
              >
                <Icon name="User" size={16} />
                <span>Account</span>
              </Button>
            </nav>
          )}

          {/* User Menu */}
          {user ? (
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-foreground">
                  {userProfile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userProfile?.role?.toUpperCase() || 'STAFF'}
                </p>
              </div>

              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full overflow-hidden bg-accent flex items-center justify-center shrink-0">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Icon name="User" size={16} color="white" />
                )}
              </div>

              {/* Sign Out Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <Icon name="LogOut" size={14} />
                <span className="hidden sm:block">Sign Out</span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => handleNavigation('/login')}
              className="flex items-center space-x-2"
            >
              <Icon name="LogIn" size={16} />
              <span>Sign In</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;