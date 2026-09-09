"use client";

import Link from "next/link";
import { Ship, Search, Filter, AlertTriangle, ShieldCheck, Anchor } from "lucide-react";

export default function VesselsPage() {
  return (
    <div className="flex-1 h-full relative overflow-y-auto bg-surface-lowest">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight mb-2 flex items-center gap-3">
              <Ship className="w-6 h-6" />
              VESSEL FLEET MONITORING
            </h1>
            <p className="text-sm text-on-surface-variant max-w-2xl">
              Global registry of tracked commercial vessels. Global tracking is currently disabled. 
              Vessels are only tracked dynamically during investigations.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded text-sm font-medium hover:bg-primary-container hover:text-on-primary-container transition-colors"
            >
              Export List
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface border border-outline-variant rounded p-4 shadow-sm flex items-center gap-4 opacity-50">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Tracked Vessels</div>
              <div className="text-xl font-bold text-on-surface">0</div>
            </div>
          </div>
          
          <div className="bg-surface border border-outline-variant rounded p-4 shadow-sm flex items-center gap-4 opacity-50">
            <div className="w-10 h-10 bg-error/10 rounded-full flex items-center justify-center text-error">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">High Risk</div>
              <div className="text-xl font-bold text-on-surface">0</div>
            </div>
          </div>
          
          <div className="bg-surface border border-outline-variant rounded p-4 shadow-sm flex items-center gap-4 opacity-50">
            <div className="w-10 h-10 bg-tertiary/10 rounded-full flex items-center justify-center text-tertiary">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Active Investigations</div>
              <div className="text-xl font-bold text-on-surface">0</div>
            </div>
          </div>
          
          <div className="bg-surface border border-outline-variant rounded p-4 shadow-sm flex items-center gap-4 opacity-50">
            <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Anchored / Port</div>
              <div className="text-xl font-bold text-on-surface">0</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <input 
            type="text" 
            placeholder="Search by Vessel Name, MMSI, or IMO number (Currently Disabled)..." 
            disabled
            className="w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant rounded text-sm focus:outline-none transition-shadow opacity-50"
          />
        </div>

        {/* Vessel Table */}
        <div className="bg-surface border border-outline-variant rounded shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Vessel Identity</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Type & Flag</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Last Position</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Risk</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                  Global Fleet View is disabled. Vessels are tracked within specific investigations.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
