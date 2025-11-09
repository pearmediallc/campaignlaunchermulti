import React, { createContext, useContext, useState, ReactNode } from 'react';
import axios from 'axios';

interface CreativeLibraryUser {
  id: number;
  email: string;
  name: string;
}

interface CreativeLibraryContextType {
  isAuthenticated: boolean;
  user: CreativeLibraryUser | null;
  token: string | null;
  authenticate: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const CreativeLibraryContext = createContext<CreativeLibraryContextType | undefined>(undefined);

export const useCreativeLibrary = () => {
  const context = useContext(CreativeLibraryContext);
  if (!context) {
    throw new Error('useCreativeLibrary must be used within a CreativeLibraryProvider');
  }
  return context;
};

interface CreativeLibraryProviderProps {
  children: ReactNode;
}

export const CreativeLibraryProvider: React.FC<CreativeLibraryProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<CreativeLibraryUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const authenticate = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    console.log('\n🔐 ========== CREATIVE LIBRARY AUTHENTICATION ==========');
    console.log(`📧 Email: ${email}`);

    setLoading(true);

    try {
      // Use the same URL as LibrarySelector for consistency (CSP allows creative-library.onrender.com)
      const baseURL = process.env.REACT_APP_CREATIVE_LIBRARY_URL
        ? `${process.env.REACT_APP_CREATIVE_LIBRARY_URL}/api`
        : 'https://creative-library.onrender.com/api';

      console.log(`🌐 Authenticating with: ${baseURL}/auth/login`);

      const response = await axios.post(`${baseURL}/auth/login`, {
        email,
        password
      });

      console.log('📦 Response status:', response.status);

      if (response.data.success) {
        const { token: newToken, user: userData } = response.data;

        console.log('✅ Authentication successful');
        console.log(`👤 User: ${userData.name} (${userData.email})`);
        console.log(`🎫 Token received: ${newToken.substring(0, 20)}...`);

        setToken(newToken);
        setUser(userData);
        setIsAuthenticated(true);

        console.log('================================================\n');

        return { success: true };
      } else {
        console.log('❌ Authentication failed:', response.data.error);
        console.log('================================================\n');

        return {
          success: false,
          error: response.data.error || 'Authentication failed'
        };
      }
    } catch (error: any) {
      console.error('❌ Authentication error:', error.response?.data || error.message);
      console.log('================================================\n');

      return {
        success: false,
        error: error.response?.data?.error || 'Failed to connect to Creative Library'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('\n🚪 Logging out of Creative Library');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const value: CreativeLibraryContextType = {
    isAuthenticated,
    user,
    token,
    authenticate,
    logout,
    loading
  };

  return (
    <CreativeLibraryContext.Provider value={value}>
      {children}
    </CreativeLibraryContext.Provider>
  );
};
