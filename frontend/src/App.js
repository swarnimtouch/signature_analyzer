import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SignatureAnalyzer from './components/SignatureAnalyzer'; // ✅ Updated Component Name
import AdminLogin from './components/Admin/AdminLogin';
import AdminPanel from './components/Admin/AdminPanel';
import './App.css';

// Protected Route Component for Admin
const ProtectedAdminRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public Route - Signature Analysis Tool */}
        <Route path="/" element={<SignatureAnalyzer />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminPanel />
            </ProtectedAdminRoute>
          }
        />

        {/* Redirect /admin to /admin/dashboard */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default App;