import React, { useState } from 'react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import { brandConfig } from '../config/brand';
import {
  ArrowRight,
  Lock,
  User,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface LoginPageProps {
  onBackToWebsite?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBackToWebsite }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('qamanager');
  const [password, setPassword] = useState('Manager@12345');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSandboxRoles, setShowSandboxRoles] = useState(true);

  const executeLogin = async (userToAuth: string, passToAuth: string) => {
    setError(null);
    setLoading(true);
    try {
      await login(userToAuth, passToAuth);
    } catch (err: any) {
      let message = err.message || 'Authentication failed. Please verify credentials.';
      if (message === 'Not Found' || message.includes('404')) {
        message = 'Authentication service endpoint not reachable. Please ensure the backend server is running on http://127.0.0.1:8000.';
      } else if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        message = 'Cannot connect to backend server. Please ensure the backend is running on http://127.0.0.1:8000.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    await executeLogin(username, password);
  };

  const selectSandboxAccount = (uname: string) => {
    const cred = DEMO_CREDENTIALS[uname];
    if (cred) {
      setUsername(uname);
      setPassword(cred.pass);
      setError(null);
    }
  };

  const handleQuickLogin = async (uname: string) => {
    const cred = DEMO_CREDENTIALS[uname];
    if (cred) {
      setUsername(uname);
      setPassword(cred.pass);
      await executeLogin(uname, cred.pass);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Website Button */}
        {onBackToWebsite && (
          <div className="mb-4">
            <button
              onClick={onBackToWebsite}
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to SmartQMS Overview</span>
            </button>
          </div>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <BrandLogo size="lg" showSubtitle={false} />
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-semibold">
            {brandConfig.productSuite}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sign in to access your quality workspace and release gates.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 sm:p-7 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-0.5">Account Sign In</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Authenticate using your provisioned organization credentials.
          </p>

          {error && (
            <div className="mb-4 p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="name@organization.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-xs shadow-sm transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Sandbox Role Switcher */}
          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowSandboxRoles(!showSandboxRoles)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 uppercase tracking-wider py-1 cursor-pointer"
            >
              <span>Evaluation Role Presets</span>
              {showSandboxRoles ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showSandboxRoles && (
              <div className="grid grid-cols-1 gap-2 mt-2 pt-1">
                {Object.entries(DEMO_CREDENTIALS).map(([uname, info]) => (
                  <div
                    key={uname}
                    className={`p-2 rounded-md text-xs transition-colors flex items-center justify-between border ${
                      username === uname
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectSandboxAccount(uname)}
                      className="flex-1 text-left cursor-pointer focus:outline-none"
                    >
                      <div className="font-semibold text-slate-900 dark:text-slate-200">{info.title}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Account: @{uname}</div>
                    </button>
                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        {info.role}
                      </span>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleQuickLogin(uname)}
                        className="px-2 py-1 text-[10px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                        title={`Sign in immediately as ${info.title}`}
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Security & Standard Note */}
        <div className="text-center mt-5 text-[11px] text-slate-500 dark:text-slate-400">
          <p>Protected by token-based authentication & ISO/IEC 25010 Quality Standards.</p>
        </div>
      </div>
    </div>
  );
};
