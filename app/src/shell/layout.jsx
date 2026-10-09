import { useUiPreferences } from '../preferences/ui-preferences.jsx';

import { RolePreview } from '../auth/role-preview.jsx';

import { writeApi } from '../data/query-client.js';

import { AuthContext } from '../auth/auth-context.js';

import React, { useContext, useState } from 'react';

import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Sidebar } from './sidebar.jsx';
import { Breadcrumbs } from './breadcrumbs.jsx';

import { RecordHeaderContext } from '../components/record-actions.jsx';

import { Logo } from '../components/brand.jsx';

import { ErrorNotice } from '../components/feedback.jsx';

/** Private application shell with navigation and sign-out. */
export function Layout() {
  const location = useLocation();
  const recordPage =
    location.pathname === '/profile' ||
    /^\/(incidents|tasks|knowledge|services|collections|monitors|groups|integrations|workspace|on-call)\/(?!new(?:\/|$)|fields(?:\/|$))[^/]+\/?$/.test(
      location.pathname,
    );
  const listPage = [
    '/dashboard/reports',
    '/settings/audit',
    '/services',
    '/collections',
    '/monitors',
    '/incidents',
    '/tasks',
    '/knowledge',
    '/groups',
    '/workspace',
    '/integrations',
  ].includes(location.pathname.replace(/\/$/, ''));
  const { user, setUser, loading: sessionLoading } = useContext(AuthContext);
  const [recordHeader, setRecordHeader] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { leftCollapsed: collapsed, rightCollapsed, setPreference } = useUiPreferences();
  const changeCollapsed = (value) => setPreference('leftCollapsed', value);
  if (!sessionLoading && !user) return <Navigate to="/login" replace />;
  const logout = async () => {
    setBusy(true);
    try {
      await writeApi('/auth/logout', { method: 'POST', body: {} });
      setUser(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      data-app-shell
      data-nav-collapsed={collapsed}
      className={`min-h-screen ${collapsed ? 'md:pl-20' : 'md:pl-72'}`}
    >
      <Sidebar
        user={user}
        logout={logout}
        busy={busy || sessionLoading}
        collapsed={collapsed}
        setCollapsed={changeCollapsed}
        renderBrand={(compact) => <Logo compact={compact} />}
      />
      <main
        id="main"
        data-record-collapsed={recordPage ? rightCollapsed : undefined}
        className={
          listPage
            ? 'list-main'
            : recordPage
              ? 'record-main mx-auto max-w-none'
              : 'mx-auto min-h-[calc(100dvh-5rem)] max-w-6xl space-y-6 p-4 lg:p-6'
        }
      >
        <RolePreview banner />
        {recordPage ? (
          <div className="record-sticky-header space-y-3">
            <Breadcrumbs resolveNames={!sessionLoading} />
            <div ref={setRecordHeader} />
          </div>
        ) : (
          <Breadcrumbs resolveNames={!sessionLoading} />
        )}
        <ErrorNotice>{error}</ErrorNotice>
        <div
          key={location.pathname}
          className={
            listPage ? 'list-outlet' : recordPage ? 'record-scroll-area space-y-6' : 'space-y-6'
          }
          tabIndex={recordPage ? 0 : undefined}
          role={recordPage ? 'region' : undefined}
          aria-label={recordPage ? 'Record content' : undefined}
        >
          <RecordHeaderContext.Provider value={recordPage ? recordHeader : null}>
            <Outlet />
          </RecordHeaderContext.Provider>
        </div>
      </main>
    </div>
  );
}
