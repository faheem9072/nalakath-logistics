'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { dataRepo } from '@/lib/data-service';
import { AssignmentEvent } from '@/types/database';
import { ShieldAlert } from 'lucide-react';

export default function AuditLogsPage() {
  const [events, setEvents] = useState<AssignmentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dataRepo.getAssignmentEvents().then((ev) => {
      setEvents(ev);
      setIsLoading(false);
    });
  }, []);

  return (
    <PageContainer
      title="Operational Audit Logs"
      subtitle="Complete tamper-evident log of reassignments, duty confirmations, trip dispatches, and completions."
    >
      {isLoading ? (
        <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
          Loading audit trails...
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500 text-sm">
            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No audit records logged yet.
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Event Type</th>
                  <th className="px-5 py-3.5">Assignment ID</th>
                  <th className="px-5 py-3.5">Audit Reason / Description</th>
                  <th className="px-5 py-3.5">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">
                        {e.event_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {e.assignment_id.slice(0, 13)}...
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-800">
                      {e.reason || 'Operational status transition'}
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                      {JSON.stringify(e.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
