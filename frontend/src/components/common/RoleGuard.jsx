import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const RoleGuard = ({ allowedRoles, requireHod = false, children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard based on their role
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'TEACHER') return <Navigate to="/teacher" replace />;
    if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
  }

  if (requireHod && !user.is_hod) {
    return <Navigate to="/teacher" replace />;
  }

  return children;
};
