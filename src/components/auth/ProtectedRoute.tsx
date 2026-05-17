import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userRole?: string | null;
  allowedRole?: UserRole;
  isAuthenticated: boolean;
  isInitializing: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  userRole, 
  allowedRole, 
  isAuthenticated,
  isInitializing 
}) => {
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCFB]">
        <div className="w-12 h-12 border-4 border-[#00A859]/20 border-t-[#00A859] rounded-full animate-spin mb-4" />
        <p className="text-black/40 font-medium animate-pulse">Verificando permissões...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole && userRole !== allowedRole) {
    // Se tentar acessar admin e não for admin, vai pro dashboard
    if (allowedRole === 'admin') {
      alert("Acesso negado: apenas administradores podem acessar esta área.");
      return <Navigate to="/dashboard" replace />;
    }
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
