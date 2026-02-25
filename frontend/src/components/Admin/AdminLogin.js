import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';

const AdminLogin = () => {
  const apiURL = 'https://doctorly.in/signature_analyzer_api/api'; // ✅ Updated API URL for local development
  
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  
  const navigate = useNavigate();

  const validateForm = () => {
    let tempErrors = {};
    let isValid = true;

    if (!credentials.email) {
      isValid = false;
      tempErrors.email = "Email address is required.";
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      isValid = false;
      tempErrors.email = "Please enter a valid email address.";
    }

    if (!credentials.password) {
      isValid = false;
      tempErrors.password = "Password is required.";
    } else if (credentials.password.length < 6) {
      isValid = false;
      tempErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(tempErrors);
    return isValid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    if (apiError) setApiError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return; 
    }

    try {
      const response = await axios.post(`${apiURL}/admin/login`, credentials);
      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.token);
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setApiError('Invalid Email or Password'); 
    }
  };

  return (
    <div className="login-container d-flex justify-content-center align-items-center">
      <div className="card login-card shadow-lg">
        <div className="card-body p-5">
          <h3 className="text-center mb-5 login-gradient-text fw-bold">SIGNATURE ADMIN</h3>
          
          {apiError && <div className="alert alert-danger p-2 small text-center mb-4">{apiError}</div>}
          
          <form onSubmit={handleLogin} noValidate>
            <div className="mb-4">
              <div className="input-wrapper">
                <i className={`fas fa-envelope input-icon ${errors.email ? 'text-danger' : ''}`}></i>
                <input 
                  type="email" 
                  name="email" 
                  className={`form-control custom-input ${errors.email ? 'is-invalid-custom' : ''}`} 
                  placeholder="Enter email id"
                  value={credentials.email}
                  onChange={handleChange} 
                />
              </div>
              {errors.email && <div className="validation-error">{errors.email}</div>}
            </div>
            
            <div className="mb-5">
              <div className="input-wrapper">
                <i className={`fas fa-lock input-icon ${errors.password ? 'text-danger' : ''}`}></i>
                <input 
                  type="password" 
                  name="password" 
                  className={`form-control custom-input ${errors.password ? 'is-invalid-custom' : ''}`} 
                  placeholder="Enter password"
                  value={credentials.password}
                  onChange={handleChange} 
                />
              </div>
              {errors.password && <div className="validation-error">{errors.password}</div>}
            </div>

            <button type="submit" className="btn w-100 fw-bold gradient-btn">
              LOGIN <i className="fas fa-arrow-right ms-2"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;