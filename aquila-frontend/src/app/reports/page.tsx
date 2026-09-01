"use client";

import { mockReports } from "@/lib/mockData";
import Link from "next/link";
import { FileText, Search, Download, ExternalLink, Calendar, MapPin } from "lucide-react";
import { useState } from "react";

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReports = mockReports.filter(r => 
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.investigationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.location.toLowerCase().includes(searchQuery.toLowerCase())
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
          
          <div className="flex gap-3">
            <button 
              onClick={() => alert("New report creation unavailable in DEMO.")}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded text-sm font-medium hover:bg-primary-container hover:text-on-primary-container transition-colors"
            >
              New Report
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Report ID, Investigation ID, or Location..." 
            className="w-full pl-12 pr-4 py-3 bg-surface border border-outline-variant rounded text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-shadow"
          />
        </div>

        {/* Reports Table */}
        <div className="bg-surface border border-outline-variant rounded shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Report ID & Date</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Investigation</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Assessment Summary</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Top Candidate</th>
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                    No reports found matching your search.
                  </td>
                </tr>
              ) : (
                filteredReports.map(report => (
                  <tr key={report.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-primary font-mono">{report.id}</div>
                      <div className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(report.generatedAt).toISOString().slice(0, 16).replace('T', ' ')}Z
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/investigation/${report.investigationId}`} className="font-bold text-on-surface hover:text-primary transition-colors hover:underline">
                        {report.investigationId}
                      </Link>
                      <div className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        {report.location.split(' (')[0]}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-on-surface max-w-xs truncate" title={report.assessment}>
                        {report.assessment}
                      </div>
                      <div className="text-[10px] text-on-surface-variant font-mono mt-1 uppercase">
                        Data Quality: {report.dataQuality}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-on-surface">{report.topCandidate.split(' (')[0]}</div>
                      <div className="font-mono text-[11px] text-on-surface-variant mt-0.5">
                        {report.topCandidate.split('(')[1]?.replace(')', '')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {report.status === 'FINAL' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary font-bold text-[10px] rounded uppercase tracking-widest border border-primary/20">
                          Final
                        </span>
                      ) : report.status === 'DRAFT' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-tertiary/10 text-tertiary font-bold text-[10px] rounded uppercase tracking-widest border border-tertiary/20">
                          Draft
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface-variant text-on-surface-variant font-bold text-[10px] rounded uppercase tracking-widest border border-outline-variant">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => window.print()}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors rounded" 
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <Link href={`/investigation/${report.investigationId}/report`} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors rounded" title="View Report">
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
