import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const RoleGuard = ({ allowedRoles, requireHod = false, allowHod = false, children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isHod = user.role === 'TEACHER' && user.is_hod;

  if (allowedRoles) {
    const roleMatches = allowedRoles.includes(user.role);
    const hodAllowed = allowHod && isHod;
    if (!roleMatches && !hodAllowed) {
      if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
      if (user.role === 'TEACHER') return <Navigate to="/teacher" replace />;
      if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
    }
  }

  if (requireHod && !isHod) {
    return <Navigate to="/teacher" replace />;
  }

  return children;
};
