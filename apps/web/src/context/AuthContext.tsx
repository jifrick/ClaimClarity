import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loginDemo: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loginDemo: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    return {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'rajesh.sharma@example.in',
      displayName: 'Rajesh Sharma',
    };
  });

  const loginDemo = () => {
    setUser({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'rajesh.sharma@example.in',
      displayName: 'Rajesh Sharma',
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
