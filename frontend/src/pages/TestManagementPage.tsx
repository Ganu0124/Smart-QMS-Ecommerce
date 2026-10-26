import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { TestCase } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Zap,
  ExternalLink,
  ShieldCheck,
  Send,
} from 'lucide-react';

export const TestManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Execution Modal
  const [executingTest, setExecutingTest] = useState<TestCase | null>(null);
  const [execOutcome, setExecOutcome] = useState<'pass' | 'fail' | 'blocked'>('pass');
  const [actualResult, setActualResult] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  // Payment Gateway Simulator State
  const [simOrderId, setSimOrderId] = useState('ORD-9982');
  const [simAmount, setSimAmount] = useState('49.99');
  const [simIdempotencyKey, setSimIdempotencyKey] = useState('idem-key-88127391');
  const [simResponse, setSimResponse] = useState<any | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const loadTests = async () => {
    setLoading(true);
    try {
      const data = await api.getTestCases({
        project_id: 1,
        scenario_category: selectedCategory || undefined,
      });
      setTestCases(data);
    } catch (e) {
      console.error('Failed to load test cases', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, [selectedCategory]);

  const openExecutionModal = (tc: TestCase) => {
    setExecutingTest(tc);
    setExecOutcome((tc.status as any) || 'pass');
    setActualResult(tc.actual_result || '');
    setEvidenceNotes(tc.evidence_notes || '');
    setEvidenceUrl(tc.evidence_url || '');
  };

  const handleExecuteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executingTest) return;
    try {
      await api.executeTest(executingTest.id, {
        status: execOutcome,
        actual_result: actualResult,
        evidence_notes: evidenceNotes,
        evidence_url: evidenceUrl,
      });
      setExecutingTest(null);
      loadTests();
    } catch (err: any) {
      alert(`Test execution recording failed: ${err.message}`);
    }
  };

  const handleSimulatePayment = async () => {
    setSimLoading(true);
    setSimResponse(null);
    try {
      const res = await api.simulatePaymentGateway({
        order_id: simOrderId,
        amount: parseFloat(simAmount) || 10.0,
        currency: 'USD',
        idempotency_key: simIdempotencyKey,
      });
      setSimResponse(res);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const isTester = ['admin', 'quality_manager', 'tester'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>E-Commerce Test Suite & Payment Simulation</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Phase 4 (VERIFY): 10 mandatory e-commerce scenarios with live payment idempotency simulator and verifiable audit traces.
          </p>
        </div>
      </div>

      {/* Interactive Payment Gateway Idempotency Simulator Widget */}
      <div className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <span>Payment Gateway Idempotency Simulator</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase font-mono font-medium">
                  Sandbox Active
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Simulate payment webhook arrival. Send identical callback twice to verify duplicate-charge prevention.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs mb-4">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Order ID</label>
            <input
              type="text"
              value={simOrderId}
              onChange={(e) => setSimOrderId(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Amount ($USD)</label>
            <input
              type="number"
              step="0.01"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Transaction Idempotency Key</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={simIdempotencyKey}
                onChange={(e) => setSimIdempotencyKey(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => setSimIdempotencyKey(`idem-key-${Math.floor(Math.random() * 1000000)}`)}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer"
              >
                New Key
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Click &apos;Trigger Callback&apos; multiple times with the same key to verify idempotency</span>
          </div>

          <button
            onClick={handleSimulatePayment}
            disabled={simLoading}
            className="flex items-center justify-center space-x-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-medium shadow-sm transition-colors cursor-pointer self-end"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{simLoading ? 'Simulating Callback...' : 'Trigger Webhook Callback'}</span>
          </button>
        </div>

        {/* Simulation Output Card */}
        {simResponse && (
          <div
            className={`mt-4 p-3.5 rounded-md border text-xs ${
              simResponse.is_duplicate
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200'
                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-200'
            }`}
          >
            <div className="flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="font-bold uppercase tracking-wider">{simResponse.status}</span>
                <p className="mt-0.5">{simResponse.message}</p>
                {simResponse.prevented_double_charge && (
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mt-1">
                    ✓ Verified: Double-charge prevented! Customer balance untouched on re-delivery.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 10 E-Commerce Test Scenarios Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Mandatory E-Commerce Test Matrix</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">10 scenarios covering checkout, duplicate payment, cart concurrency, and security</p>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">{testCases.length} Test Scenarios</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">TC Code</th>
                <th className="px-4 py-3">Scenario Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Expected Result</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {testCases.map((tc) => {
                const isFail = tc.status === 'fail';
                return (
                  <tr
                    key={tc.id}
                    className={`transition-colors ${
                      isFail ? 'bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/60 dark:hover:bg-red-950/30' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {tc.tc_code}
                    </td>
                    <td className="px-4 py-3.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{tc.scenario_title}</div>
                      {tc.actual_result && (
                        <div
                          className={`text-[11px] mt-1 font-mono line-clamp-2 ${
                            isFail ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          Actual: {tc.actual_result}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase font-mono">
                        {tc.scenario_category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 max-w-xs line-clamp-2 text-[11px]">
                      {tc.expected_result}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge value={tc.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {isTester ? (
                        <button
                          onClick={() => openExecutionModal(tc)}
                          className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Play className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span>Execute / Record</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Tester role required</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execute Test Modal */}
      {executingTest && (
        <Modal
          isOpen={!!executingTest}
          onClose={() => setExecutingTest(null)}
          title={`Execute Test: ${executingTest.tc_code}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleExecuteSubmit} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">{executingTest.scenario_title}</h4>
              <p className="text-slate-600 dark:text-slate-400 mt-1">{executingTest.test_steps}</p>
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400">
                <span className="font-semibold">Expected: </span>
                {executingTest.expected_result}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">Execution Status Outcome</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setExecOutcome('pass')}
                  className={`py-2 rounded-md border font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer text-xs ${
                    execOutcome === 'pass'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PASS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExecOutcome('fail')}
                  className={`py-2 rounded-md border font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer text-xs ${
                    execOutcome === 'fail'
                      ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-500'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>FAIL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExecOutcome('blocked')}
                  className={`py-2 rounded-md border font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer text-xs ${
                    execOutcome === 'blocked'
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-500'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>BLOCKED</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Actual Observed Result</label>
              <textarea
                rows={3}
                required
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                placeholder="Observed system response, transaction behavior, and latency..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Evidence Notes / Trace ID</label>
                <input
                  type="text"
                  required
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Automated test log #PASS-DUP-991"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Evidence Attachment URL</label>
                <input
                  type="text"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                  placeholder="https://ci.smartqms.local/run/..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setExecutingTest(null)}
                className="px-3.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
              >
                Save Execution Result
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
