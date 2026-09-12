import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, UserRole, AuthContextType } from '../types/auth';
import { api } from '../services/api';

const AUTH_TOKEN_KEY = '@texxxnopor_auth_token';
const AUTH_USER_KEY = '@texxxnopor_auth_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Restaurar sesión guardada al iniciar la aplicación (en móvil y web)
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [savedToken, savedUserRaw] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);

        if (savedToken && savedUserRaw) {
          const parsedUser = JSON.parse(savedUserRaw) as UserProfile;
          setUserToken(savedToken);
          setUser(parsedUser);
        }
      } catch (err) {
        console.warn('[AuthContext] Error restaurando sesión persistente:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const signIn = async (token: string, newUser: UserProfile) => {
    setUserToken(token);
    setUser(newUser);
    try {
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser)),
      ]);
    } catch (err) {
      console.warn('[AuthContext] Error guardando sesión:', err);
    }
  };

  const signOut = async () => {
    setUserToken(null);
    setUser(null);
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(AUTH_USER_KEY),
      ]);
    } catch (err) {
      console.warn('[AuthContext] Error eliminando sesión:', err);
    }
  };

  const updateUser = (updated: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const nextUser = { ...prev, ...updated };
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser)).catch(() => {});
      return nextUser;
    });
  };

  const switchRoleDebug = (newRole: UserRole) => {
    if (!user) {
      const debugUser: UserProfile = {
        id: `usr_${newRole.toLowerCase()}`,
        email: `${newRole.toLowerCase()}@texxxnopor.com`,
        username: newRole === 'CREATOR' ? 'Luna Roja (Actor)' : newRole === 'ADMIN' ? 'AdminMaster' : 'Alex99',
        role: newRole,
        avatarUrl: newRole === 'CONSUMER' ? undefined : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
        isVerified: newRole !== 'CONSUMER',
      };
      const debugToken = `token_${newRole}`;
      signIn(debugToken, debugUser);
      return;
    }

    const updated: UserProfile = {
      ...user,
      role: newRole,
      isVerified: newRole === 'CREATOR' || newRole === 'ADMIN',
    };
    setUser(updated);
    AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated)).catch(() => {});
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
