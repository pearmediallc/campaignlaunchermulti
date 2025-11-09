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
    console.log('\n🔐 ========== CREATIVE LIBRARY AUTHENTICATION START ==========');
    console.log(`📧 Step 1: Login attempt for email: ${email}`);

    setLoading(true);

    try {
      // Use the same URL as LibrarySelector for consistency (CSP allows creative-library.onrender.com)
      const baseURL = process.env.REACT_APP_CREATIVE_LIBRARY_URL
        ? `${process.env.REACT_APP_CREATIVE_LIBRARY_URL}/api`
        : 'https://creative-library.onrender.com/api';

      console.log(`🌐 Step 2: Making POST request to: ${baseURL}/auth/login`);

      const response = await axios.post(`${baseURL}/auth/login`, {
        email,
        password
      });

      console.log('✅ Step 3: Response received successfully');
      console.log('📊 Step 4: Response status code:', response.status);
      console.log('📦 Step 5: Checking response structure...');

      // Log the entire response object structure
      console.log('🔍 Step 6: response.data exists?', !!response.data);
      console.log('🔍 Step 7: response.data type:', typeof response.data);
      console.log('🔍 Step 8: response.data keys:', response.data ? Object.keys(response.data) : 'N/A');

      console.log('📋 Step 9: Full response.data:', response.data);

      // Check if success field exists
      console.log('🔍 Step 10: response.data.success exists?', 'success' in response.data);
      console.log('🔍 Step 11: response.data.success value:', response.data.success);

      // Check if data field exists
      console.log('🔍 Step 12: response.data.data exists?', 'data' in response.data);
      console.log('🔍 Step 13: response.data.data type:', response.data.data ? typeof response.data.data : 'undefined');

      if (response.data.data) {
        console.log('🔍 Step 14: response.data.data keys:', Object.keys(response.data.data));
        console.log('📋 Step 15: Full response.data.data:', response.data.data);
      }

      console.log('\n🎯 Step 16: Checking if authentication was successful...');

      if (response.data.success) {
        console.log('✅ Step 17: response.data.success is TRUE, proceeding with data extraction');

        // Backend returns { success: true, data: { token, user } }
        console.log('🔓 Step 18: Extracting token and user from response.data.data...');

        if (!response.data.data) {
          console.error('❌ ERROR: response.data.data is undefined or null!');
          throw new Error('Backend returned success but data object is missing');
        }

        const dataObject = response.data.data;
        console.log('🔍 Step 19: dataObject extracted:', dataObject);
        console.log('🔍 Step 20: dataObject.token exists?', 'token' in dataObject);
        console.log('🔍 Step 21: dataObject.user exists?', 'user' in dataObject);

        const newToken = dataObject.token;
        const userData = dataObject.user;

        console.log('🔍 Step 22: newToken type:', typeof newToken);
        console.log('🔍 Step 23: newToken length:', newToken ? newToken.length : 0);
        console.log('🔍 Step 24: userData type:', typeof userData);
        console.log('🔍 Step 25: userData exists?', !!userData);

        if (!newToken) {
          console.error('❌ ERROR: Token is missing from response.data.data');
          throw new Error('Backend returned success but token is missing');
        }

        if (!userData) {
          console.error('❌ ERROR: User is missing from response.data.data');
          throw new Error('Backend returned success but user is missing');
        }

        console.log('🔍 Step 26: userData keys:', Object.keys(userData));
        console.log('🔍 Step 27: userData.name exists?', 'name' in userData);
        console.log('🔍 Step 28: userData.email exists?', 'email' in userData);
        console.log('🔍 Step 29: userData.id exists?', 'id' in userData);

        console.log('✅ Step 30: Authentication successful!');
        console.log(`👤 Step 31: User name: ${userData.name}`);
        console.log(`📧 Step 32: User email: ${userData.email}`);
        console.log(`🆔 Step 33: User ID: ${userData.id}`);
        console.log(`🎫 Step 34: Token (first 20 chars): ${newToken.substring(0, 20)}...`);
        console.log(`🎫 Step 35: Token (full length): ${newToken.length} characters`);

        console.log('💾 Step 36: Setting token in state...');
        setToken(newToken);

        console.log('💾 Step 37: Setting user in state...');
        setUser(userData);

        console.log('💾 Step 38: Setting isAuthenticated to true...');
        setIsAuthenticated(true);

        console.log('✅ Step 39: All state updated successfully!');
        console.log('========== CREATIVE LIBRARY AUTHENTICATION SUCCESS ==========\n');

        return { success: true };
      } else {
        console.log('❌ Step 17: response.data.success is FALSE');
        console.log('❌ Authentication failed:', response.data.error);
        console.log('========== CREATIVE LIBRARY AUTHENTICATION FAILED ==========\n');

        return {
          success: false,
          error: response.data.error || 'Authentication failed'
        };
      }
    } catch (error: any) {
      console.error('💥 EXCEPTION CAUGHT in authenticate function');
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);

      if (error.response) {
        console.error('📡 Error response exists');
        console.error('📡 Error response status:', error.response.status);
        console.error('📡 Error response data:', error.response.data);
      } else {
        console.error('📡 No error.response - this is a client-side error or network error');
      }

      console.log('========== CREATIVE LIBRARY AUTHENTICATION ERROR ==========\n');

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to connect to Creative Library'
      };
    } finally {
      console.log('🏁 Step 40: Cleaning up - setting loading to false');
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
