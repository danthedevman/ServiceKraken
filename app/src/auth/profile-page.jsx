import React, { useContext } from 'react';
import { AuthContext } from './auth-context.js';
import { UserRecord } from '../features/workspace/user-record.jsx';
import { useResource } from '../data/use-resource.js';
import { ErrorNotice } from '../components/feedback.jsx';

/** Load the same workspace directory record for every user's own profile. */
export function ProfilePage() {
  const { user } = useContext(AuthContext);
  const members = useResource('/members');
  const member = members.data?.members.find((item) => item.id === user?.id);
  return (
    <div className="space-y-6">
      <ErrorNotice>{members.error}</ErrorNotice>
      {member ? (
        <UserRecord key={member.id} member={member} />
      ) : (
        <p role="status">Loading profile…</p>
      )}
    </div>
  );
}
