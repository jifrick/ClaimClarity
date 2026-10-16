import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  token?: string;
  isDemo?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isSupabaseConfigured: boolean;
  loginDemo: (userId?: string, displayName?: string) => void;
  loginEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isSupabaseConfigured: false,
  loginDemo: () => {},
  loginEmail: async () => {},
  signUpEmail: async () => {},
  logout: async () => {},
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') &&
  supabaseAnonKey.length > 20
);

let supabaseClient: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    // Check local storage for persistent demo or auth session
    const saved = localStorage.getItem('claimclarity_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'rajesh.sharma@example.in',
      displayName: 'Rajesh Sharma',
      isDemo: true,
    };
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('claimclarity_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('claimclarity_user');
    }
  }, [user]);

  // Listen to Supabase Auth state changes if configured
  useEffect(() => {
    if (!supabaseClient) return;

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || 'user@example.com',
          displayName: session.user.user_metadata?.display_name || session.user.email || 'Claimant',
          token: session.access_token,
          isDemo: false,
        });
      }
    });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || 'user@example.com',
          displayName: session.user.user_metadata?.display_name || session.user.email || 'Claimant',
          token: session.access_token,
          isDemo: false,
        });
      } else if (!user?.isDemo) {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginDemo = (userId = '00000000-0000-0000-0000-000000000001', displayName = 'Rajesh Sharma') => {
    setUser({
      id: userId,
      email: `${userId.substring(0, 8)}@example.in`,
      displayName,
      isDemo: true,
    });
  };

  const loginEmail = async (email: string, password: string) => {
    if (!supabaseClient) {
      throw new Error('Supabase authentication is not configured in client environment.');
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user && data.session) {
      setUser({
        id: data.user.id,
        email: data.user.email || email,
        displayName: data.user.user_metadata?.display_name || email,
        token: data.session.access_token,
        isDemo: false,
      });
    }
  };

  const signUpEmail = async (email: string, password: string, displayName?: string) => {
    if (!supabaseClient) {
      throw new Error('Supabase authentication is not configured in client environment.');
    }
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email,
        },
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    if (supabaseClient && !user?.isDemo) {
      await supabaseClient.auth.signOut();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isSupabaseConfigured,
        loginDemo,
        loginEmail,
        signUpEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
