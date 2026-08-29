"use client";

import { use } from "react";
import { FileText, Share2, Save, AlertTriangle, Image as ImageIcon, Crosshair, HelpCircle, Wind, Anchor, Search, Database, Clock, ListChecks, Info } from "lucide-react";

export default function InvestigationReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex-1 p-6 flex justify-center overflow-y-auto h-full bg-[var(--color-background)]">
      
      {/* Report Container */}
      <div className="w-full max-w-5xl bg-[var(--color-surface-low)] border border-[#10283A] shadow-[0px_8px_24px_rgba(0,0,0,0.5)] p-8 rounded-lg relative overflow-hidden mb-16">
        
        {/* Atmospheric Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-primary-container)] to-transparent opacity-50"></div>
        
        {/* Report Header */}
        <header className="flex flex-col md:flex-row justify-between items-start border-b border-[var(--color-outline-variant)] pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-primary)] tracking-tight mb-2">AQUILA</h1>
            <h2 className="text-xl font-semibold text-[var(--color-on-surface)] uppercase tracking-wide">MARITIME POLLUTION INVESTIGATION REPORT</h2>
            <p className="font-mono text-sm text-[var(--color-on-surface-variant)] mt-2">REF: INV-2023-889-A | GEN: 2023-10-27T14:32Z</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button className="bg-[var(--color-primary-container)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary)] transition-colors px-4 py-2 rounded flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase">
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <button className="border border-[#10283A] text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors px-4 py-2 rounded flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase">
              <Share2 className="w-4 h-4" />
              Share Report
            </button>
            <button className="border border-[#10283A] text-[var(--color-on-surface)] hover:border-[var(--color-primary)] transition-colors px-4 py-2 rounded flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase">
              <Save className="w-4 h-4" />
              Save Report
            </button>
          </div>
        </header>

        {/* Incident Metrics Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8 bg-[var(--color-surface-container)] border-y border-[var(--color-outline-variant)] py-4 px-2">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Incident ID</span>
            <span className="font-mono text-sm text-[var(--color-on-surface)]">{id}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Detection Time</span>
            <span className="font-mono text-sm text-[var(--color-on-surface)]">10:45:22 UTC</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Location</span>
            <span className="font-mono text-sm text-[var(--color-on-surface)]">43.2°N, 12.1°E</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Spill Area</span>
            <span className="font-mono text-sm text-[var(--color-on-surface)]">42.5 km²</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Oil Assessment</span>
            <span className="font-mono text-sm text-[var(--color-primary)]">91% Conf.</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Origin Conf.</span>
            <span className="font-mono text-sm text-[var(--color-primary)]">98% Env.</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Top Candidate</span>
            <span className="font-mono text-sm text-[var(--color-error)]">MMSI 319203810</span>
          </div>
        </div>

        {/* 1. Incident Summary */}
        <section className="mb-10 bg-[var(--color-surface-container)] p-6 rounded border border-[#10283A]">
          <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> 1. Incident Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Status</span>
              <div className="font-mono text-sm text-[var(--color-on-surface)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary-container)] shadow-[0_0_8px_#28c7d9]"></span>
                Closed / Attributed
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Priority</span>
              <div className="font-mono text-sm text-[var(--color-error)] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Critical
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Oil Assessment Confidence</span>
              <div className="font-mono text-sm text-[var(--color-primary)] flex items-center gap-2">
                91%
                <div className="flex-1 h-1 bg-[#10283A] rounded overflow-hidden">
                  <div className="h-full bg-[var(--color-primary-container)] w-[91%]"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Grid Layout for Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          
          {/* 2. Satellite Evidence */}
          <section className="flex flex-col gap-4">
            <h4 className="text-xl font-semibold text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-2">2. Satellite Evidence</h4>
            <div className="bg-[#06111F] rounded border border-[#10283A] h-48 relative overflow-hidden group">
              <div className="bg-cover bg-center w-full h-full opacity-60" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD00BiMd7sKNw8GNp8BFzworPf9JGujapyx5bkjNm8ykEWvBHFElmai2aqWe4pDGhcWFd2SUBeJGKGplutar4JDeGyCxwmSV2ryTIvyMFQeKBCNqin9kDvfhqsCC3C3VVv9QSzKQG2d_RANVeDb7rLQYi6v0oTE3XqZaUC9YCYxZW0zxS0v8pwVaIYyUdl0FlUA22M8ZVpDVGXb1Dhz2ly8CEBghlDeUdrljKY4_5OemJwrmb8ozWZ1xQ')" }}></div>
              <div className="absolute bottom-2 left-2 right-2 flex justify-between font-mono text-xs bg-[var(--color-surface-highest)]/80 backdrop-blur px-2 py-1 rounded">
                <span>SAR Sentinel-1</span>
                <span>UTC 10:45:22</span>
              </div>
            </div>
          </section>

          {/* 3. Slick Characteristics */}
          <section className="flex flex-col gap-4">
            <h4 className="text-xl font-semibold text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-2">3. Slick Characteristics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--color-surface-container)] p-3 rounded border border-[#10283A]">
                <div className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)]">Estimated Area</div>
                <div className="font-mono text-sm text-[var(--color-primary)] mt-1">42.5 km²</div>
              </div>
              <div className="bg-[var(--color-surface-container)] p-3 rounded border border-[#10283A]">
                <div className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)]">Drift Vector</div>
                <div className="font-mono text-sm text-[var(--color-on-surface)] mt-1">145° at 1.2kts</div>
              </div>
              <div className="bg-[var(--color-surface-container)] p-3 rounded border border-[#10283A] col-span-2">
                <div className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-on-surface-variant)]">Spectral Signature</div>
                <div className="font-mono text-sm text-[var(--color-on-surface)] mt-1">Matches heavy crude profile</div>
              </div>
            </div>
          </section>

          {/* 4. Oil vs Look-Alike Assessment */}
          <section className="flex flex-col gap-4">
            <h4 className="text-xl font-semibold text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-2">4. Oil vs Look-Alike Assessment</h4>
            <div className="bg-[var(--color-surface-container)] rounded border border-[#10283A] p-4 h-full">
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-2">Analysis confirms slick signature is consistent with mineral oil, discounting common look-alikes.</p>
              <ul className="list-disc pl-4 font-mono text-sm text-[var(--color-on-surface)] space-y-1">
                <li>Wind Speed Threshold: OK (&gt; 3m/s)</li>
                <li>Biogenic Slick Filter: Negative</li>
                <li>Wake Signature Filter: Negative</li>
              </ul>
            </div>
          </section>

          {/* 5. Origin Reconstruction */}
          <section className="flex flex-col gap-4">
            <h4 className="text-xl font-semibold text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-2">5. Origin Reconstruction</h4>
            <div className="bg-[var(--color-surface-container)] rounded border border-[#10283A] p-4 h-full">
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-2">Back-trajectory modeling aligns slick origin with vessel path within 98% probability envelope.</p>
              <div className="font-mono text-xs text-[var(--color-on-surface)] bg-[var(--color-surface-low)] p-2 rounded inline-block mt-2">
                T0: -14hrs | Err Margin: ± 800m
              </div>
            </div>
          </section>

          {/* 6. Drift Forecast */}
          <section className="flex flex-col gap-4 lg:col-span-2">
            <h4 className="text-xl font-semibold text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-2">6. Drift Forecast</h4>
            <div className="bg-[var(--color-surface-container)] rounded border border-[#10283A] p-4">
              <p className="text-sm text-[var(--color-on-surface-variant)]">Forward trajectory indicates slick will disperse significantly over next 48 hours without reaching coastal areas based on current meteorological inputs.</p>
            </div>
          </section>

          {/* 7. Vessel Candidates */}
          <section className="flex flex-col gap-4">
            <h4 className="text-xl font-semibold text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-2">7. Vessel Candidates</h4>
            <div className="bg-[var(--color-surface-container)] rounded border border-[#10283A] p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Anchor className="w-5 h-5 text-[var(--color-error)]" />
                  <span className="font-mono text-sm text-[var(--color-on-surface)]">MMSI 319203810</span>
                </div>
                <span className="bg-[var(--color-error)]/10 text-[var(--color-error)] font-mono px-2 py-1 rounded text-xs">Primary</span>
              </div>
              <div className="flex justify-between items-center opacity-50">
                <div className="flex items-center gap-2">
                  <Anchor className="w-5 h-5 text-[var(--color-on-surface-variant)]" />
                  <span className="font-mono text-sm text-[var(--color-on-surface)]">MMSI 220048190</span>
                </div>
                <span className="text-[var(--color-on-surface-variant)] font-mono text-xs">Excluded</span>
              </div>
            </div>
          </section>

          {/* 8. Attribution Evidence */}
          <section className="flex flex-col gap-4">
            <h4 className="text-xl font-semibold text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-2">8. Attribution Evidence</h4>
            <ul className="space-y-2 text-sm text-[var(--color-on-surface-variant)] list-disc pl-4 bg-[var(--color-surface-container)] rounded border border-[#10283A] p-4 h-full">
              <li>AIS track perfectly intersects with simulated spill origin point at T0.</li>
              <li>Vessel speed anomaly detected (-4kts) during intersection window.</li>
              <li>No other vessels present within 50nm radius during time window.</li>
            </ul>
          </section>

          {/* 9. Counterfactual Simulation */}
          <section className="flex flex-col gap-4 lg:col-span-2">
            <h4 className="text-xl font-semibold text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-2">9. Counterfactual Simulation</h4>
            <div className="bg-[#06111F] rounded border border-[#10283A] h-64 relative overflow-hidden flex flex-col md:flex-row">
              <div className="w-full md:w-2/3 h-full relative">
                <div className="bg-cover bg-center w-full h-full opacity-70" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDZroabbGvDQaHZrGF6Xo26j4xJrod9AF1zxI-t1qORq9o7D8q_7yd9LH0pxTyOyNXiIUrliCpjd75rKnmmP__QLHa6hfqQZiG9E2Ux9O_dKJVxOUdbbvlK7b8rUOQGcan28oRADz6sMifcFDrxD476NASfZ3GsCXtMCvl54dco2CnDud-blZr68zKh08NmXaq61kc0Cc4KNR3E20gk8FhQcHpC92_6eFyH5WbrsTTnEfs_Idy_mcMPDg')" }}></div>
              </div>
              <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-[#10283A] p-4 bg-[var(--color-surface-low)] flex flex-col justify-center">
                <span className="text-[11px] font-bold tracking-widest text-[var(--color-primary)] uppercase mb-2">Simulation Run #44</span>
                <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">Monte Carlo simulation using varied wind/current inputs confirms high probability of intersection.</p>
              </div>
            </div>
          </section>

          {/* 10. Uncertainty & Data Quality */}
          <section className="flex flex-col gap-4">
            <h4 className="text-xl font-semibold text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-2">10. Uncertainty &amp; Data Quality</h4>
            <div className="bg-[var(--color-surface-container)] rounded border border-[#10283A] p-4 h-full">
              <p className="text-sm text-[var(--color-on-surface-variant)]">SAR imagery quality: High (Sentinel-1 IW). Metocean data confidence: Medium-High. Overall assessment confidence constrained by lack of immediate in-situ verification.</p>
            </div>
          </section>

          {/* 11. Evidence Timeline */}
          <section className="flex flex-col gap-4">
            <h4 className="text-xl font-semibold text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-2">11. Evidence Timeline</h4>
            <div className="bg-[var(--color-surface-container)] rounded border border-[#10283A] p-4 h-full">
              <ul className="font-mono text-sm text-[var(--color-on-surface-variant)] space-y-2">
                <li><span className="text-[var(--color-on-surface)]">T-14h:</span> Suspected discharge event</li>
                <li><span className="text-[var(--color-on-surface)]">T0:</span> SAR detection</li>
                <li><span className="text-[var(--color-on-surface)]">T+2h:</span> Analysis complete</li>
              </ul>
            </div>
          </section>

          {/* 12. Recommended Investigation Actions */}
          <section className="flex flex-col gap-4 lg:col-span-2">
            <h4 className="text-xl font-semibold text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-2">12. Recommended Investigation Actions</h4>
            <div className="bg-[var(--color-surface-container)] rounded border border-[#10283A] p-4">
              <ul className="list-disc pl-4 text-sm text-[var(--color-on-surface-variant)] space-y-1">
                <li>Request next port state control inspection for MMSI 319203810.</li>
                <li>Review Oil Record Book for recent entries.</li>
                <li>Task additional satellite imaging over projected drift path.</li>
              </ul>
            </div>
          </section>
        </div>

        {/* Disclaimer Footer */}
        <footer className="mt-12 pt-6 border-t border-[#10283A] text-center">
          <p className="font-mono text-xs text-[var(--color-on-surface-variant)]/70 uppercase tracking-wider flex items-center justify-center gap-2">
            <Info className="w-4 h-4" />
            THIS REPORT REPRESENTS AN INTELLIGENCE ASSESSMENT BASED ON AVAILABLE DATA. IT DOES NOT CONSTITUTE DEFINITIVE LEGAL ATTRIBUTION OR PROOF OF LIABILITY. ALL FINDINGS ARE SUBJECT TO REVIEW BY RELEVANT AUTHORITIES.
          </p>
        </footer>

      </div>
    </div>
  );
}
