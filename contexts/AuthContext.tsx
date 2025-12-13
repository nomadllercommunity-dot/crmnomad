import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Starting to load user...');
    loadUser()
      .then(() => console.log('AuthProvider: User loaded successfully'))
      .catch(err => {
        console.error('Failed to load user on mount:', err);
      });
  }, []);

  const loadUser = async () => {
    try {
      console.log('AuthProvider: Getting user from AsyncStorage...');
      const userData = await AsyncStorage.getItem('user');
      console.log('AuthProvider: Got user data:', userData ? 'exists' : 'null');
      if (userData) {
        const parsed = JSON.parse(userData);
        console.log('AuthProvider: Parsed user:', parsed);
        setUser(parsed);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      try {
        await AsyncStorage.removeItem('user');
      } catch (e) {
        console.error('Error clearing corrupted user data:', e);
      }
    } finally {
      console.log('AuthProvider: Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
