import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AUDIT_EVENT_TYPES, AuditEvent } from '../../types/governance';
import { DecisionIndicator } from '../BrandMark';

interface AuditTrailViewProps {
  events: AuditEvent[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ events }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');

  const filteredEvents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return [...events]
      .filter((e) => {
        if (eventTypeFilter !== 'ALL' && e.eventType !== eventTypeFilter) return false;
        if (q) {
          const hit =
            e.eventId.toLowerCase().includes(q) ||
            e.requestId.toLowerCase().includes(q) ||
            e.actor.toLowerCase().includes(q) ||
            e.explanation.toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [events, searchTerm, eventTypeFilter]);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#E2E0D8] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-[#647182] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Event ID, Request ID, Actor, or Explanation..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F6F2] border border-[#E2E0D8] rounded-md text-[#0F1C2E] focus:outline-none focus:border-[#1F6E72]"
            />
          </div>

          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            aria-label="Filter by audit event type"
            className="px-3 py-2 text-xs bg-[#F7F6F2] border border-[#E2E0D8] rounded-md text-[#0F1C2E]"
          >
            <option value="ALL">All Event Types</option>
            {AUDIT_EVENT_TYPES.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-[#647182]">
          Application-level append-only audit record · Updates and deletions are disabled
        </p>
      </div>

      <div className="bg-white border border-[#E2E0D8] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E2E0D8] text-xs text-[#647182]">
          Showing <strong className="font-mono-tabular text-[#0F1C2E]">{filteredEvents.length}</strong> of{' '}
          <strong className="font-mono-tabular text-[#0F1C2E]">{events.length}</strong> audit events
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E0D8] bg-[#F7F6F2] text-[11px] font-semibold text-[#647182]">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Event ID</th>
                <th className="py-2.5 px-4">Event Type</th>
                <th className="py-2.5 px-4">Request ID</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Outcome</th>
                <th className="py-2.5 px-4">Policies</th>
                <th className="py-2.5 px-4">Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEAE2] text-xs">
              {filteredEvents.map((evt) => (
                <tr key={evt.eventId} className="hover:bg-[#F7F6F2]">
                  <td className="py-3 px-4 font-mono-tabular text-[#647182] whitespace-nowrap">
                    {evt.timestamp.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-[#0F1C2E] whitespace-nowrap">
                    {evt.eventId}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-[11px] text-[#3B495C] whitespace-nowrap">
                    {evt.eventType}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-[#0F1C2E] whitespace-nowrap">
                    {evt.requestId || '—'}
                  </td>
                  <td className="py-3 px-4 text-[#3B495C] max-w-[160px] truncate">
                    {evt.actor}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <DecisionIndicator status={evt.decision} />
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-[#647182] whitespace-nowrap">
                    {evt.policyReferences.length > 0 ? evt.policyReferences.join(', ') : '—'}
                  </td>
                  <td className="py-3 px-4 text-[#3B495C] min-w-[240px] max-w-[360px]">
                    {evt.explanation}
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-[#647182]">
                    No audit events match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
