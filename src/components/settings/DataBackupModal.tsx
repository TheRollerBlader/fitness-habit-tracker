import React, { useState } from 'react';
import { exportDatabaseToJSON, triggerDownload, importDatabaseFromJSON, resetDatabase } from '../../db/backup';
import { seedDemoData } from '../../db/seed';
import { formatISODate } from '../../utils/date';
import { X, Download, Upload, Database, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({ isOpen, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const json = await exportDatabaseToJSON();
      const filename = `apexpulse_backup_${formatISODate(new Date())}.json`;
      triggerDownload(json, filename);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Reading backup file...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importDatabaseFromJSON(content);
      setImportStatus(res.message);
      if (res.success) {
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    };
    reader.readAsText(file);
  };

  const handleSeedDemo = async () => {
    if (window.confirm('Seed 90-day realistic fitness & habit demo data? This will overwrite or complement current data.')) {
      setIsSeeding(true);
      await seedDemoData(true);
      setIsSeeding(false);
      window.location.reload();
    }
  };

  const handleReset = async () => {
    if (window.confirm('WARNING: Are you sure you want to completely erase all habits, workouts, and PR history? This cannot be undone.')) {
      await resetDatabase();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">
              Data Management & Backup
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            ApexPulse operates with a strict <strong>local-first</strong> architecture. Your habits,
            sensor metrics, and PRs are stored entirely inside your browser's IndexedDB. Export
            regular JSON backups to preserve your training journal across devices.
          </p>

          {/* Backup & Restore Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-850 hover:border-slate-700 text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <Download className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-bold text-white">Export JSON Backup</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Download full database snapshot
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 mt-3 font-semibold">
                Instant Download →
              </span>
            </button>

            <label className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-850 hover:border-slate-700 text-left transition-all group flex flex-col justify-between cursor-pointer">
              <div>
                <Upload className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-bold text-white">Import JSON Backup</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Restore from previous snapshot
                </p>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 mt-3 font-semibold">
                Select File →
              </span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {importStatus && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono">
              {importStatus}
            </div>
          )}

          {/* Demo Data Seeder */}
          <div className="p-4 rounded-xl border border-indigo-900/40 bg-indigo-950/20 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Seed 90-Day Demo History
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Populate 90 days of habit streaks, 36 progressive workouts, and PRs
              </p>
            </div>
            <button
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 transition-colors disabled:opacity-50"
            >
              {isSeeding ? 'Seeding...' : 'Seed Data'}
            </button>
          </div>

          {/* Reset Danger Zone */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Erase Database
                </h4>
                <p className="text-[11px] text-slate-500">
                  Delete all local tables and start fresh
                </p>
              </div>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> IndexedDB Active
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
