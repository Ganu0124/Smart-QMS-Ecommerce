import React from 'react';
import { ShieldAlert, ArrowRight, CheckCircle2, Bug, ShieldCheck } from 'lucide-react';

interface ReleaseGateAlertBannerProps {
  onNavigateTab: (tab: string) => void;
  isBlocked: boolean;
}

export const ReleaseGateAlertBanner: React.FC<ReleaseGateAlertBannerProps> = ({
  onNavigateTab,
  isBlocked,
}) => {
  return (
    <div
      className={`p-4 rounded-lg border transition-colors shadow-sm ${
        isBlocked
          ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
          : 'bg-green-50/40 dark:bg-green-950/20 border-green-200 dark:border-green-900/50'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div
            className={`p-2 rounded-md shrink-0 ${
              isBlocked
                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
            }`}
          >
            {isBlocked ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Smart Release Gate Governance
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  isBlocked
                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                    : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
                }`}
              >
                {isBlocked ? 'Release Blocked' : 'Ready For Approval'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
              {isBlocked
                ? 'Critical defect DEF-01-001 (Duplicate Payment Callback) must be remediated and retested before deployment.'
                : 'All 8 mandatory quality gates cleared. Release Candidate is eligible for Quality Manager authorization.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
          {isBlocked ? (
            <>
              <button
                onClick={() => onNavigateTab('defects')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm"
              >
                <Bug className="w-3.5 h-3.5" />
                <span>View DEF-01-001</span>
              </button>
              <button
                onClick={() => onNavigateTab('releases')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors shadow-sm"
              >
                <span>Inspect Gates</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onNavigateTab('releases')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-green-700 hover:bg-green-800 text-white transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Authorize Release</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const DemoBanner = ReleaseGateAlertBanner;
