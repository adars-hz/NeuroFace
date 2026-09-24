import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Sliders, Save, CheckCircle2, ShieldAlert, Info } from 'lucide-react';

const FineRulesPage = () => {
  const [rule, setRule] = useState({
    min_eligible_pct: 85.0,
    condonation_min_pct: 75.0,
    fine_amount: 500.0,
    is_active: true
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRule = async () => {
      try {
        const res = await api.get('/admin/fine-rules');
        setRule(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRule();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/admin/fine-rules', rule);
      setRule(res.data);
      setMsg('Institutional attendance rules successfully updated.');
      setTimeout(() => setMsg(''), 3500);
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Institutional Rules & Fine Configuration</h1>
        <p className="text-slate-600 text-sm">Configure minimum attendance thresholds, condonation limits, and fine fees</p>
      </div>

      {msg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{msg}</span>
        </div>
      )}

      {/* Policy Card */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Direct Exam Eligibility (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="50"
                  max="100"
                  required
                  value={rule.min_eligible_pct}
                  onChange={(e) => setRule({ ...rule, min_eligible_pct: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">Project specification defaults to 85%.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Condonation Min Floor (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="40"
                  max="100"
                  required
                  value={rule.condonation_min_pct}
                  onChange={(e) => setRule({ ...rule, condonation_min_pct: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">Students below this percentage are detained.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Condonation Fine Amount (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="50"
                  min="0"
                  required
                  value={rule.fine_amount}
                  onChange={(e) => setRule({ ...rule, fine_amount: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">Flat fine levied for condonation bracket.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="font-bold flex items-center space-x-1.5 text-slate-900">
              <Info className="w-4 h-4 text-teal-600" />
              <span>Current Formula & Bracket Evaluation</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>
                <span className="font-semibold text-emerald-700">Attendance &ge; {rule.min_eligible_pct}%:</span> Direct Exam Eligibility (No fine required).
              </li>
              <li>
                <span className="font-semibold text-amber-700">{rule.condonation_min_pct}% &le; Attendance &lt; {rule.min_eligible_pct}%:</span> Eligible for Exam upon payment of ₹{rule.fine_amount} fine.
              </li>
              <li>
                <span className="font-semibold text-rose-700">Attendance &lt; {rule.condonation_min_pct}%:</span> Detained (Not eligible for semester examination).
              </li>
              <li>
                <span className="font-semibold text-blue-700">HOD Medical Waiver:</span> Increases effective attendance classes without deleting original lecture logs: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">min(100, (Present + Waived) / Total * 100)</code>.
              </li>
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 flex items-center space-x-2 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Institutional Policy</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FineRulesPage;
