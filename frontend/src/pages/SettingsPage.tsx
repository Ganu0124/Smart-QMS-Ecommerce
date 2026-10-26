import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  Shield,
  Key,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileCheck,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changingPass, setChangingPass] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [reseedMsg, setReseedMsg] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    setChangingPass(true);
    setPasswordMsg(null);
    try {
      const res = await api.changePassword({ old_password: oldPassword, new_password: newPassword });
      setPasswordMsg({ type: 'success', text: res.message || 'Password changed successfully.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setPasswordMsg({ type: 'error', text: e.message || 'Failed to change password.' });
    } finally {
      setChangingPass(false);
    }
  };

  const handleReseed = async () => {
    if (!window.confirm('Are you sure you want to reset the quality baseline data? This restores the standard e-commerce governance state.')) {
      return;
    }
    setReseeding(true);
    setReseedMsg(null);
    try {
      const res = await api.reseedSystem();
      setReseedMsg(res.message || 'Quality baseline records successfully restored.');
    } catch (e: any) {
      setReseedMsg('Failed to restore baseline: ' + e.message);
    } finally {
      setReseeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>System Settings & Profile</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Quality management system governance policies, user credentials, and demonstration environment controls.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Profile Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-sm">
              {user?.full_name?.charAt(0) || user?.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.full_name || user?.username}</h2>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">@{user?.username}</span>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-1">Assigned Role</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                <Shield className="w-3 h-3 mr-1" />
                {user?.role}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-1">Email Address</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{user?.email}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-1">Active Status</span>
              <span className="inline-flex items-center text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Verified & Active
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Password & Policy */}
        <div className="lg:col-span-2 space-y-5">
          {/* Security Credentials */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 mb-1">
              <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Change Password</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Update authentication credentials. Passwords are encrypted with bcrypt salt rounds &ge; 12.
            </p>

            {passwordMsg && (
              <div
                className={`mb-3 p-2.5 rounded text-xs flex items-center space-x-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password *</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">New Password *</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password *</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={changingPass}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-medium shadow-sm transition-colors cursor-pointer"
                >
                  {changingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Quality Release Gate Thresholds Policy */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 mb-1">
              <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Smart Release Gate Quality Policy</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Automated rules evaluated against live database records prior to deployment sign-off:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
              {[
                { title: 'Mandatory Requirements', value: '100% Approved & Baselined' },
                { title: 'Architecture Reviews', value: '10/10 Checklist Pass & Baselined' },
                { title: 'Peer Code Reviews', value: '100% Sign-Off (Dual Control)' },
                { title: 'Test Pass Rate (TPR)', value: '≥ 90.0% Pass Rate' },
                { title: 'Critical / High Defects', value: '0 Open (Zero Tolerance)' },
                { title: 'Security Verification', value: '0 Open Vulnerabilities' },
                { title: 'Requirement Approval (RAR)', value: '≥ 80.0% Approval Threshold' },
                { title: 'Audit Evidence Attached', value: '100% Tests & Defects' },
              ].map((g, i) => (
                <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">{g.title}</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">{g.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Environment & Baseline Database Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2 mb-1">
              <Database className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Quality Baseline Management</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Restore database to verified baseline quality records including quality objectives, requirements, 12 test cases, 3 software quality metrics, and release governance data.
            </p>

            {reseedMsg && (
              <div className="mb-3 p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                {reseedMsg}
              </div>
            )}

            <button
              onClick={handleReseed}
              disabled={reseeding}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reseeding ? 'animate-spin' : ''}`} />
              <span>{reseeding ? 'Restoring Baseline...' : 'Restore Quality Baseline'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
