import React from 'react';
import { ShieldAlert, Terminal, Lock, RefreshCw } from 'lucide-react';

export const MaintenanceScreen: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#060809] flex items-center justify-center p-4 selection:bg-[#f59e0b] selection:text-black">
      <div className="relative w-full max-w-[440px] rounded-3xl bg-[#0a0d0e] border border-[#1e292d] p-6 sm:p-8 flex flex-col items-center text-center shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-b from-[#f59e0b]/20 via-[#06b6d4]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Cyber Shield / Vault Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#f59e0b] via-[#fbbf24] to-[#06b6d4] p-0.5 shadow-[0_0_30px_rgba(245,158,11,0.35)] animate-pulse">
            <div className="w-full h-full rounded-3xl bg-[#0e1315] flex items-center justify-center">
              <Lock className="w-12 h-12 text-[#fbbf24]" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#ef4444] border-2 border-[#0a0d0e] flex items-center justify-center text-white shadow-lg">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* Title & Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#fbbf24] text-[11px] font-mono font-bold tracking-wider uppercase mb-3">
          <span className="w-2 h-2 rounded-full bg-[#fbbf24] animate-ping" />
          System Maintenance
        </div>

        <h1 className="text-2xl font-black text-white tracking-wide uppercase mb-2">
          Vaultfinity
        </h1>

        <p className="text-xs text-[#94a3b8] leading-relaxed mb-6 font-medium max-w-xs">
          Our core vault heist networks and database systems are undergoing scheduled maintenance and calibrations. All operations and accounts are secure.
        </p>

        {/* Status Terminal Box */}
        <div className="w-full rounded-2xl bg-[#13191b] border border-[#1e292d] p-4 text-left font-mono text-[11px] text-[#64748b] mb-6 space-y-2">
          <div className="flex items-center gap-2 text-[#06b6d4]">
            <Terminal className="w-3.5 h-3.5" />
            <span className="font-bold text-white">UPGRADE_STATUS: IN_PROGRESS</span>
          </div>
          <div className="text-[#94a3b8]">
            &gt; Purging legacy database schemas... <span className="text-[#10b981]">DONE</span>
          </div>
          <div className="text-[#94a3b8]">
            &gt; Calibrating Safecracker hashrates... <span className="text-[#10b981]">OK</span>
          </div>
          <div className="text-[#94a3b8]">
            &gt; Initializing multichain deposit vaults... <span className="text-[#fbbf24] animate-pulse">SYNCING</span>
          </div>
        </div>

        {/* Live Pulse Bar */}
        <div className="w-full h-1.5 bg-[#13191b] rounded-full overflow-hidden mb-6 border border-[#1e292d]">
          <div className="h-full bg-gradient-to-r from-[#f59e0b] via-[#06b6d4] to-[#10b981] rounded-full animate-pulse" style={{ width: '100%' }} />
        </div>

        {/* Reload Button */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:brightness-110 text-[#0a0d0e] font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.35)] transition-transform active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 stroke-[2.5]" />
          <span>Refresh System Status</span>
        </button>

        <p className="text-[10px] text-[#475569] font-mono mt-4">
          Estimated completion: ~15-30 minutes • Check back shortly
        </p>
      </div>
    </div>
  );
};
