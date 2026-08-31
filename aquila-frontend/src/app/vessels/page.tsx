"use client";

import { mockVessels } from "@/lib/mockData";
import Link from "next/link";
import { Ship, Search, Filter, AlertTriangle, ShieldCheck, MoreHorizontal, Anchor } from "lucide-react";

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
              Global registry of tracked commercial vessels, filtered by active surveillance regions and risk profiles.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded text-sm font-medium hover:bg-primary-container hover:text-on-primary-container transition-colors">
              Export List
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface border border-outline-variant rounded p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Tracked Vessels</div>
              <div className="text-xl font-bold text-on-surface">{mockVessels.length}</div>
            </div>
          </div>
          
          <div className="bg-surface border border-outline-variant rounded p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-error/10 rounded-full flex items-center justify-center text-error">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">High Risk</div>
              <div className="text-xl font-bold text-on-surface">{mockVessels.filter(v => v.riskScore === 'HIGH').length}</div>
            </div>
          </div>
          
          <div className="bg-surface border border-outline-variant rounded p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-tertiary/10 rounded-full flex items-center justify-center text-tertiary">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Active Investigations</div>
              <div className="text-xl font-bold text-on-surface">{mockVessels.filter(v => v.activeInvestigations > 0).length}</div>
            </div>
          </div>
          
          <div className="bg-surface border border-outline-variant rounded p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Anchored / Port</div>
              <div className="text-xl font-bold text-on-surface">{mockVessels.filter(v => v.status !== 'UNDERWAY').length}</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <input 
            type="text" 
            placeholder="Search by Vessel Name, MMSI, or IMO number..." 
            className="w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant rounded text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-shadow"
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
              {mockVessels.map(vessel => (
                <tr key={vessel.mmsi} className="hover:bg-surface-container-lowest transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/5 border border-primary/20 flex items-center justify-center">
                        <Ship className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <Link href={`/vessels/${vessel.mmsi}`} className="font-bold text-on-surface hover:text-primary transition-colors group-hover:underline">
                          {vessel.name}
                        </Link>
                        <div className="font-mono text-[11px] text-on-surface-variant mt-0.5">
                          MMSI: {vessel.mmsi} • IMO: {vessel.imo}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-on-surface">{vessel.type}</div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono">{vessel.flag}</span> {vessel.flagCountry}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-[11px] text-on-surface">{vessel.lastKnownPosition[1].toFixed(3)}°N, {vessel.lastKnownPosition[0].toFixed(3)}°E</div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-2">
                      <span>{new Date(vessel.lastKnownTime).toISOString().slice(11, 16)}Z</span>
                      <span>•</span>
                      <span>{vessel.speed} kn</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${vessel.status === 'UNDERWAY' ? 'bg-success' : 'bg-outline'}`}></span>
                      <span className="text-[11px] font-bold uppercase tracking-wider">{vessel.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {vessel.riskScore === 'HIGH' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-error/10 text-error font-bold text-[10px] rounded uppercase tracking-widest border border-error/20">
                        High
                      </span>
                    ) : vessel.riskScore === 'MEDIUM' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-tertiary/10 text-tertiary font-bold text-[10px] rounded uppercase tracking-widest border border-tertiary/20">
                        Medium
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success font-bold text-[10px] rounded uppercase tracking-widest border border-success/20">
                        <ShieldCheck className="w-3 h-3" /> Low
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/vessels/${vessel.mmsi}`} className="inline-flex items-center justify-center w-8 h-8 rounded text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
