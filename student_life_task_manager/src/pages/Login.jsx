import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/AppIcon';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const Login = () => {
  const { signIn, signInDemo, loading, user, userProfile, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect: admin → admin dashboard; everyone else (staff, manager, etc.) → staff dashboard
  useEffect(() => {
    if (user && !loading && !profileLoading && userProfile) {
      if (userProfile?.role === 'admin') {
        navigate('/admin-task-management');
      } else {
        navigate('/staff-dashboard');
      }
    }
  }, [user, loading, profileLoading, userProfile, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e?.target || {};
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (authError) setAuthError('');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setIsLoading(true);
    setAuthError('');

    if (!formData?.email || !formData?.password) {
      setAuthError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signIn(formData?.email, formData?.password);
      
      if (error) {
        setAuthError(error?.message || 'Sign in failed');
      }
      // Note: Redirect is handled by useEffect after profile loads
    } catch (error) {
      setAuthError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while authenticating or loading profile
  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">
            {loading ? 'Loading...' : 'Setting up your workspace...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="/assets/images/ktech-logo.png"
            alt="ktech"
            className="h-14 mx-auto mb-4 object-contain"
          />
          <p className="text-muted-foreground">Sign in to manage tasks and team</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <Input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData?.email || ''}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <div>
            <Input
              type="password"
              name="password"
              placeholder="Password"
              value={formData?.password || ''}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {authError && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Icon name="AlertTriangle" size={16} className="text-error" />
                <p className="text-sm text-error">{authError}</p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Icon name="LogIn" size={16} />
                <span>Sign In</span>
              </div>
            )}
          </Button>

          {/* Credentials hint */}
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Sign in</h3>
            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">
                <strong>Admin:</strong> use the admin account. <strong>Staff:</strong> use the email and password your admin gave you (new accounts start with password <code className="bg-muted px-1 rounded">staff123</code> until you change it in Account).
              </p>
              <button
                type="button"
                onClick={() => setFormData({ email: 'admin123123@gmail.com', password: 'admin123123' })}
                className="text-accent hover:text-accent/80 font-medium"
              >
                Admin: admin123123@gmail.com / admin123123
              </button>
            </div>
          </div>

          {/* Demo mode when Supabase is unreachable (ERR_NAME_NOT_RESOLVED / paused project) */}
          <div className="mt-4 p-4 rounded-lg border border-amber-500/40 bg-amber-500/5">
            <h3 className="text-sm font-medium text-foreground mb-2">Can&apos;t reach the server?</h3>
            <p className="text-xs text-muted-foreground mb-3">
              If you see &quot;Can&apos;t reach Supabase&quot; above, your project may be paused or offline. Use demo mode to explore the app without a backend.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => signInDemo('admin')}
                className="text-xs px-3 py-2 rounded-md bg-accent text-accent-foreground hover:opacity-90"
              >
                Continue as Admin (demo)
              </button>
              <button
                type="button"
                onClick={() => signInDemo('staff')}
                className="text-xs px-3 py-2 rounded-md bg-muted text-foreground hover:opacity-90"
              >
                Continue as Staff (demo)
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;