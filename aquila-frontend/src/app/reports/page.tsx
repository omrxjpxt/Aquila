"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Search, ExternalLink, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { reportsApi } from "@/lib/api/reports";
import { ReportArchiveItem } from "@/lib/api/types";

export default function ReportsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [reports, setReports] = useState<ReportArchiveItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reportsApi.listReports()
      .then(data => {
        setReports(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load reports archive:", err);
        setError(err.message || "Reports archive API is unavailable.");
        setIsLoading(false);
      });
  }, []);

  const filteredReports = reports.filter(r => 
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.title && r.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 h-full relative overflow-y-auto bg-surface-lowest">
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight mb-2 flex items-center gap-3">
              <FileText className="w-6 h-6" />
              INVESTIGATION REPORTS
            </h1>
            <p className="text-sm text-on-surface-variant max-w-2xl">
              Archive of all generated forensic dossiers, environmental impact assessments, and attribution matrices.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Investigation ID or Title..." 
            className="w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant rounded text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-shadow"
          />
        </div>

        {/* Reports Table */}
        <div className="bg-surface border border-outline-variant rounded shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Investigation ID</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Priority</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Date Created</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant font-mono text-xs">
                    Loading reports...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-error font-mono text-xs">
                    {error}
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant font-mono text-xs">
                    {searchQuery.trim() ? "No reports match your search." : "No reports found."}
                  </td>
                </tr>
              ) : (
                filteredReports.map(report => (
                  <tr 
                    key={report.id} 
                    onClick={() => router.push(`/investigation/${report.id}/report`)}
                    className="hover:bg-surface-container-lowest transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-primary font-mono">{report.id}</div>
                      {report.title && (
                        <div className="text-[11px] text-on-surface-variant truncate max-w-sm mt-0.5">
                          {report.title}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded inline-block ${
                        report.priority === 'CRITICAL' ? 'bg-error/10 text-error border border-error/20' :
                        report.priority === 'HIGH' ? 'bg-tertiary/10 text-tertiary border border-tertiary/20' :
                        'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                        {report.priority}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-variant text-on-surface-variant font-bold text-[10px] rounded uppercase tracking-widest border border-outline-variant font-mono">
                          {report.status}
                        </span>
                        {report.provenance_mode === 'DEMO_MOCK' && (
                          <span className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-widest border border-amber-500/30">
                            DEMO_MOCK
                          </span>
                        )}
                        {report.provenance_mode === 'LIVE' && (
                          <span className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-widest border border-emerald-500/30">
                            LIVE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3 h-3 text-on-surface-variant shrink-0" />
                        {new Date(report.created_at).toISOString().slice(0, 16).replace('T', ' ')}Z
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/investigation/${report.id}/report`} 
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors rounded" 
                          title="View Report"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
