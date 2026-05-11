import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Project {
  id: string;
  title: string;
  description: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
  projects: Project[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  session: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const session = async (): Promise<User | null> => {
    try {
      // Check session via the BFF endpoint which calls the backend /api/v1/auth/me
      const response = await fetch('/auth/session', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          return data.user;
        }
      }
      setUser(null);
      return null;
    } catch (e) {
      console.error('Failed to get user session', e);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        await session();
      } catch (e) {
        console.error('Failed to verify session', e);
      } finally {
        setIsLoaded(true);
      }
    };

    checkSession();
  }, []);

  const login = async (userData: any) => {
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        }
      }
    } catch (e) {
      console.error('Failed to set login session', e);
    }
  };

  const logout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
      setUser(null);
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  };

  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, session }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
