import React from 'react';

interface BadgeProps {
  type?: 'status' | 'severity' | 'decision' | 'factor';
  value: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ value, size = 'sm', className = '' }) => {
  const v = (value || '').toLowerCase().trim();

  let colorClasses =
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  if (['critical', 'blocked', 'fail', 'failed', 'rejected', 'at_risk', 'breach', 'blocking release'].includes(v)) {
    colorClasses =
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60';
  } else if (['high', 'rework_required', 'retest', 'delay', 'leakage detected'].includes(v)) {
    colorClasses =
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60';
  } else if (['medium', 'in_progress', 'submitted', 'pending', 'in review', 'open', 'assigned'].includes(v)) {
    colorClasses =
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60';
  } else if (['low', 'draft', 'todo', 'not run'].includes(v)) {
    colorClasses =
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/70 dark:text-slate-400 dark:border-slate-700/60';
  } else if (
    [
      'pass',
      'passed',
      'approved',
      'closed',
      'achieved',
      'ready_for_approval',
      'ready for approval',
      'completed',
      'mitigated',
      'compliant',
      'excellent',
      'zero tolerance met',
    ].includes(v)
  ) {
    colorClasses =
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800/60';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border ${padding} ${colorClasses} tracking-tight select-none ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80 shrink-0"></span>
      <span className="truncate">{value ? value.replace(/_/g, ' ') : ''}</span>
    </span>
  );
};
