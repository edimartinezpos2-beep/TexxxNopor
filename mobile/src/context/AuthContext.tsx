import React, { createContext, useState, useContext, useEffect } from 'react';
import { UserProfile, UserRole, AuthContextType } from '../types/auth';
import { api } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  const signIn = async (token: string, newUser: UserProfile) => {
    setUserToken(token);
    setUser(newUser);
  };

  const signOut = async () => {
    setUserToken(null);
    setUser(null);
  };

  const updateUser = (updated: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const switchRoleDebug = (newRole: UserRole) => {
    if (!user) {
      setUser({
        id: `usr_${newRole.toLowerCase()}`,
        email: `${newRole.toLowerCase()}@texxxnopor.com`,
        username: newRole === 'CREATOR' ? 'Luna Roja (Actor)' : newRole === 'ADMIN' ? 'AdminMaster' : 'Alex99',
        role: newRole,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
        isVerified: newRole !== 'CONSUMER',
      });
      setUserToken(`token_${newRole}`);
      return;
    }

    setUser({
      ...user,
      role: newRole,
      isVerified: newRole === 'CREATOR' || newRole === 'ADMIN',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        userToken,
        user,
        signIn,
        signOut,
        updateUser,
        switchRoleDebug,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
