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
  token: string | null;
  login: (userData: { email: string; name: string; avatar_url?: string }) => Promise<void>;
  logout: () => Promise<void>;
  session: () => Promise<User | null>;
}

const TOKEN_KEY = 'lumina_token';
const USER_KEY = 'lumina_user';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoaded(true);
  }, []);

  const session = async (): Promise<User | null> => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setUser(null);
      return null;
    }
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (res.ok) {
        const data: User = await res.json();
        setUser(data);
        setToken(storedToken);
        localStorage.setItem(USER_KEY, JSON.stringify(data));
        return data;
      } else {
        // Token expired or invalid
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setToken(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    }
  };

  const login = async (userData: { email: string; name: string; avatar_url?: string }) => {
    try {
      const res = await fetch('/api/v1/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          name: userData.name,
          avatar_url: userData.avatar_url,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Login failed');
      }

      const data = await res.json();
      // data = { access_token, token_type, user: { id, email, full_name, avatar_url, ... } }
      const accessToken: string = data.access_token;
      const userObj: User = data.user;

      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userObj));
      setToken(accessToken);
      setUser(userObj);
    } catch (e) {
      console.error('Login failed:', e);
      throw e;
    }
  };

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, token, login, logout, session }}>
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
