import { createContext } from 'react';

/** Shared authenticated identity; private queries stay disabled while the session loads. */
export const AuthContext = createContext({ user: null, loading: true });
