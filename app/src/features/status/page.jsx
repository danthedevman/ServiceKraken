import { Select } from '../../components/forms/select.jsx';
import { statusRange } from '../../../../shared/domain/status-range.js';
import { StatusMessage } from './message.jsx';
import React from 'react';
import { ServiceHistory } from './service-history.jsx';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AdminOnly } from '../../auth/role-gates.jsx';
import { useResource } from '../../data/use-resource.js';
import { ThemeToggle } from '../../preferences/theme.jsx';
import { Logo } from '../../components/brand.jsx';
import { Badge, ErrorNotice } from '../../components/feedback.jsx';

/** A service-only status list shared by authenticated and explicitly public views. */
export function StatusPage({ publicView = false }) {
  const { token } = useParams();
  const [params, setParams] = useSearchParams();
  const requestedRange = params.get('range') || params.get('days') || '30';
  const range = ['7', '14', '30', 'quarter', 'previous-quarter'].includes(requestedRange)
    ? requestedRange
    : '30';
  const { data, error } = useResource(
    `${publicView ? `/public/status/${token}` : '/status'}?range=${range}`,
    30000,
  );
  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {!publicView && data?.iconUrl && (
            <img src={data.iconUrl} alt="" className="h-10 w-10 object-contain" />
          )}
          <h1 className="page-title">Service status</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="field-label">
            <span className="sr-only">History range</span>
            <Select
              value={range}
              onChange={(event) =>
                setParams(
                  (current) => {
                    const next = new URLSearchParams(current);
                    next.delete('days');
                    next.set('range', event.target.value);
                    return next;
                  },
                  { replace: true },
                )
              }
            >
              {[7, 14, 30].map((value) => (
                <option key={value} value={value}>
                  Last {value} days
                </option>
              ))}
              <option value="quarter">This quarter</option>
              <option value="previous-quarter">Previous quarter</option>
            </Select>
          </label>
          {!publicView && (
            <AdminOnly>
              <Link className="btn-secondary" to="/status/settings">
                Manage status page
              </Link>
            </AdminOnly>
          )}
        </div>
      </header>
      <ErrorNotice>{error}</ErrorNotice>
      {!data ? (
        <p role="status">Loading service status…</p>
      ) : (
        <>
          <StatusMessage message={data.banner} />
          <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {data.services.map((service) => (
              <li
                key={service.id}
                className="flex flex-wrap items-center justify-between gap-4 py-5"
              >
                <span className="font-medium">{service.name}</span>
                <Badge status={service.status} />
                <StatusMessage message={service.message} compact />
                <ServiceHistory
                  days={statusRange(range, new Date(data.generatedAt)).days}
                  endDate={statusRange(range, new Date(data.generatedAt)).end.toISOString()}
                  service={service}
                  services={data.services}
                  monitors={data.monitors}
                  generatedAt={data.generatedAt}
                />
              </li>
            ))}
          </ul>
          {!data.services.length && (
            <p className="text-sm text-slate-500">No services have been added yet.</p>
          )}
          <p className="text-xs text-slate-500">
            Updated {new Date(data.generatedAt).toLocaleTimeString()}
          </p>
        </>
      )}
    </section>
  );
}
/** Public pages omit private record links and management actions. */
export function PublicStatusPage() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const requestedRange = params.get('range') || params.get('days') || '30';
  const range = ['7', '14', '30', 'quarter', 'previous-quarter'].includes(requestedRange)
    ? requestedRange
    : '30';
  const { data } = useResource(`/public/status/${token}?range=${range}`, 30000);
  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <header className="mb-10 flex items-center justify-between gap-4">
        {data?.iconUrl ? (
          <img src={data.iconUrl} alt="Status page logo" className="h-14 max-w-48 object-contain" />
        ) : (
          <Logo />
        )}
        <ThemeToggle />
      </header>
      <main id="main">
        <StatusPage publicView />
      </main>
    </div>
  );
}
