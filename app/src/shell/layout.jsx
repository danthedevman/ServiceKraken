import { useUiPreferences } from '../preferences/ui-preferences.jsx';

import { RolePreview } from '../auth/role-preview.jsx';

import { writeApi } from '../data/query-client.js';

import { AuthContext } from '../auth/auth-context.js';

import React, { useContext, useState } from 'react';

import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Sidebar } from './sidebar.jsx';
import { Breadcrumbs } from './breadcrumbs.jsx';

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
            : `mx-auto min-h-[calc(100dvh-5rem)] ${recordPage ? 'record-main max-w-none space-y-3' : 'max-w-6xl space-y-6'} p-4 lg:p-6`
        }
      >
        <RolePreview banner />
        <Breadcrumbs resolveNames={!sessionLoading} />
        <ErrorNotice>{error}</ErrorNotice>
        <div key={location.pathname} className={listPage ? 'list-outlet' : 'space-y-6'}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
