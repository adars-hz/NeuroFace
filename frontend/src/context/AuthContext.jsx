import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('neuroface_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('neuroface_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          const updatedUser = { ...user, ...res.data };
          setUser(updatedUser);
          localStorage.setItem('neuroface_user', JSON.stringify(updatedUser));
        } catch (err) {
          // Only clear session if token is explicitly invalid (401).
          // Do NOT log out if backend is still starting up or temporarily offline.
          if (err.response && err.response.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    };
    verifyUser();
  }, []);

  const login = async (username_or_email, password) => {
    const res = await api.post('/auth/login', { username_or_email, password });
    const userData = res.data;
    localStorage.setItem('neuroface_token', userData.access_token);
    localStorage.setItem('neuroface_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('neuroface_token');
    localStorage.removeItem('neuroface_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
