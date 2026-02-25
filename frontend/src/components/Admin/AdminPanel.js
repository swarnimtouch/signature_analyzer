import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx'; 
import './AdminPanel.css'; 

const AdminPanel = () => {
  const apiURL = 'https://doctorly.in/signature_analyzer_api/api'; // ✅ Updated API URL for local development
  const [activeTab, setActiveTab] = useState('users'); 
    
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768); 
  const [mobileMode, setMobileMode] = useState(window.innerWidth < 768);
      
  const [stats, setStats] = useState({ total: 0, success: 0, failure: 0 });
  const [successData, setSuccessData] = useState([]);
  const [failureData, setFailureData] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- MODAL STATE FOR TEXT VIEWING ---
  const [viewTextModal, setViewTextModal] = useState({ isOpen: false, text: '', userName: '' });

  // --- DATA TABLE STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' });

  const navigate = useNavigate();

  // --- AUTH & DATA FETCH ---
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
    } else {
      fetchAllData();
    }
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setMobileMode(isMobile);
      if (isMobile) {
        setSidebarOpen(false); 
      } else {
        setSidebarOpen(true); 
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setSearchTerm('');
    setCurrentPage(1);
    setSortConfig({ key: 'createdAt', direction: 'descending' });
  }, [activeTab]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [statsRes, successRes, failureRes] = await Promise.all([
        axios.get(`${apiURL}/admin/stats`),
        axios.get(`${apiURL}/admin/success-users`),
        axios.get(`${apiURL}/admin/failure-users`)
      ]);

      setStats(statsRes.data.stats);
      setSuccessData(successRes.data.data);
      setFailureData(failureRes.data.data);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // --- HELPER FUNCTIONS ---
  const getDateParts = (dateString) => {
    if (!dateString) return { date: '-', time: '' };
    const d = new Date(dateString);
    const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return { date, time };
  };

  // --- VIEW TEXT MODAL ---
  const openTextModal = (text, name) => {
      setViewTextModal({ isOpen: true, text: text, userName: name });
  };
  const closeTextModal = () => {
      setViewTextModal({ isOpen: false, text: '', userName: '' });
  };

  // --- DOWNLOAD FUNCTION (Updated to handle both Doctor and Signature images) ---
  const handleDownloadImage = async (id, userName, tableType, imageType) => {
    try {
        document.body.style.cursor = 'wait';
        
        // imageType will be either 'doctor' or 'signature'
        const response = await axios.get(`${apiURL}/admin/image/${tableType}/${id}/${imageType}`);
        
        if (response.data.success && response.data.imageData) {
            const link = document.createElement('a');
            link.href = response.data.imageData; 
            
            // File name dynamic based on image type
            const prefix = imageType === 'doctor' ? 'DoctorPhoto' : 'Signature';
            link.download = `${prefix}_${userName.replace(/\s+/g, '_')}_${id}.png`; 
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert("Image data not found on server.");
        }
    } catch (error) {
        console.error("Download Error", error);
        alert("Failed to download image. Network error.");
    } finally {
        document.body.style.cursor = 'default';
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await axios.delete(`${apiURL}/admin/delete/${type}/${id}`);
      if (type === 'success') {
        setSuccessData(prev => prev.filter(item => item.id !== id));
        setStats(prev => ({ ...prev, success: prev.success - 1, total: prev.total - 1 }));
      } else {
        setFailureData(prev => prev.filter(item => item.id !== id));
        setStats(prev => ({ ...prev, failure: prev.failure - 1, total: prev.total - 1 }));
      }
    } catch (error) {
      alert("Failed to delete record.");
    }
  };

  // --- EXCEL EXPORT FUNCTION (Updated for Name and Text) ---
  const handleExportExcel = (data, fileName) => {
    if (!data || data.length === 0) {
      alert("No data to export!");
      return;
    }

    const formattedData = data.map(item => ({
        ID: item.id,
        "User Name": item.userName, 
        "Analysis Text": item.analysisText || "N/A", 
        "Created At": new Date(item.createdAt).toLocaleString(),
        "User IP": item.userIp,
        "Error (If any)": item.errorMessage || "N/A"
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${fileName}_${Date.now()}.xlsx`);
  };

  // --- SORTING & FILTERING LOGIC ---
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getProcessedData = (data) => {
    // 1. Searching (By User Name)
    let filtered = data;
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = data.filter(item => 
        item.userName?.toLowerCase().includes(lowerTerm)
      );
    }

    // 2. Sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';

        if (sortConfig.key === 'createdAt') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        } 
        else if (sortConfig.key === 'id') {
            valA = parseInt(valA);
            valB = parseInt(valB);
        }
        else if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  // --- RENDER TABLES ---
  const renderTable = (rawData, type) => {
    if (loading) return <div className="text-center p-5">Loading data...</div>;

    const processedData = getProcessedData(rawData);
      
    const totalPages = Math.ceil(processedData.length / rowsPerPage);
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

    // Headers updated for Signature AI with Doctor Image column
    let headers = [
      { key: 'id', title: "No", sortable: true },
      { key: 'userName', title: "Doctor Name", sortable: true }, 
      { key: 'createdAt', title: "Date", sortable: true }
    ];

    if (type === 'failure') {
      headers.push(
        { key: 'errorMessage', title: "Error Msg", sortable: false },
        { key: 'doctorImg', title: <>Doctor<br/>Image</>, align: "text-center", sortable: false }, 
        { key: 'signatureImg', title: <>Signature<br/>Image</>, align: "text-center", sortable: false }, 
        { key: 'action', title: "Delete", align: "text-center", sortable: false }
      );
    } else if (type === 'success') {
      headers.push(
        { key: 'doctorImg', title: <>Doctor<br/>Image</>, align: "text-center", sortable: false }, 
        { key: 'signatureImg', title: <>Signature<br/>Image</>, align: "text-center", sortable: false },
        { key: 'analysisText', title: <>Analysis<br/>Text</>, align: "text-center", sortable: false }, 
        { key: 'action', title: "Delete", align: "text-center", sortable: false }
      );
    }

    return (
      <div className="custom-table-container shadow-sm fade-in">
        
        {/* --- TABLE CONTROLS --- */}
        <div className="table-controls p-3 d-flex justify-content-between align-items-center flex-wrap gap-3">
            
            <div className="d-flex align-items-center entries-control">
                <label className="me-2 text-sm">Show</label>
                <select 
                    className="form-select form-select-sm border-secondary rounded-pill" 
                    style={{width: '80px', textAlign: 'center'}}
                    value={rowsPerPage}
                    onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                </select>
                <label className="ms-2 text-sm">entries</label>
            </div>

            <div className="d-flex gap-2 align-items-center flex-wrap right-controls">
                <div className="search-box position-relative">
                    <i className="fas fa-search search-icon"></i>
                    <input 
                        type="text" 
                        className="form-control form-control-sm border-secondary rounded-pill ps-5" 
                        placeholder="Search Name..." 
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>

                <button 
                    className="btn-excel-export" 
                    onClick={() => handleExportExcel(processedData, type === 'success' ? 'Signature_Success' : 'Signature_Failure')}
                    title="Download Table as Excel"
                >
                    <i className="fas fa-file-excel me-2"></i> Export Excel
                </button>
            </div>
        </div>

        <div className="table-responsive">
          <table className="table table-custom table-hover mb-0">
            <thead>
              <tr>
                {headers.map((col, index) => (
                  <th 
                    key={index} 
                    className={`${col.align || 'text-center'} ${col.sortable ? 'sortable-header' : ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="d-flex align-items-center justify-content-center gap-2">
                        {col.title}
                        {col.sortable && (
                            <span className="sort-icon">
                                {sortConfig.key === col.key ? (
                                    sortConfig.direction === 'ascending' ? <i className="fas fa-sort-up"></i> : <i className="fas fa-sort-down"></i>
                                ) : (
                                    <i className="fas fa-sort text-muted"></i>
                                )}
                            </span>
                        )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="no-records-row">
                    <div style={{ opacity: 0.5, fontSize: '3rem', marginBottom: '10px' }}>
                      <i className="fas fa-file-signature"></i>
                    </div>
                    {searchTerm ? "No matching names found." : "No records found."}
                  </td>
                </tr>
              ) : (
                currentRows.map((row) => {
                   const { date, time } = getDateParts(row.createdAt);

                   return (
                  <tr key={row.id}>
                    {/* Rows Data */}
                    <td className="text-nowrap text-center" data-label="No">{row.id}</td>
                    
                    <td className="wrap-cell fw-bold text-center" data-label="Doctor Name">
                        {row.userName}
                    </td>
                    
                    <td className="date-cell" data-label="Date">
                        <div className="date-part">{date}</div>
                        <div className="time-part">{time}</div>
                    </td>
                    
                    {type === 'failure' && (
                      <>
                        <td className="text-danger small" data-label="Error">{row.errorMessage}</td>
                        {/* Download Doctor Image Button */}
                        <td className="text-center" data-label="Doctor Image">
                          <button className="btn-download" title="Download Doctor Photo" onClick={() => handleDownloadImage(row.id, row.userName, 'failure', 'doctor')}>
                            <i className="fas fa-download"></i> {/* ✅ Icon changed to download */}
                          </button>
                        </td>
                        {/* Download Signature Image Button */}
                        <td className="text-center" data-label="Signature Image">
                          <button className="btn-download" title="Download Signature" onClick={() => handleDownloadImage(row.id, row.userName, 'failure', 'signature')}>
                            <i className="fas fa-download"></i> {/* ✅ Icon changed to download */}
                          </button>
                        </td>
                        <td className="text-center" data-label="Delete">
                          <button className="btn-delete" title="Delete" onClick={() => handleDelete(row.id, 'failure')}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </>
                    )}

                    {type === 'success' && (
                      <>
                        {/* Download Doctor Image Button */}
                        <td className="text-center" data-label="Doctor Image">
                          <button className="btn-download" title="Download Doctor Photo" onClick={() => handleDownloadImage(row.id, row.userName, 'success', 'doctor')}>
                            <i className="fas fa-download"></i> {/* ✅ Icon changed to download */}
                          </button>
                        </td>
                        {/* Download Signature Image Button */}
                        <td className="text-center" data-label="Signature Image">
                          <button className="btn-download" title="Download Signature" onClick={() => handleDownloadImage(row.id, row.userName, 'success', 'signature')}>
                            <i className="fas fa-download"></i> {/* ✅ Icon changed to download */}
                          </button>
                        </td>
                        <td className="text-center" data-label="Analysis Text">
                          <button className="btn-view-text" title="View Analysis" onClick={() => openTextModal(row.analysisText, row.userName)}>
                            <i className="fas fa-eye"></i> View Text
                          </button>
                        </td>
                        <td className="text-center" data-label="Delete">
                          <button className="btn-delete" title="Delete" onClick={() => handleDelete(row.id, 'success')}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION FOOTER --- */}
        {processedData.length > 0 && (
            <div className="table-footer p-3 d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div className="text-muted text-sm">
                    Showing <b>{indexOfFirstRow + 1}</b> to <b>{Math.min(indexOfLastRow, processedData.length)}</b> of <b>{processedData.length}</b> entries
                </div>
                
                <div className="pagination-group d-flex align-items-center gap-2 flex-wrap justify-content-center">
                    <button 
                        className="btn-page-nav" 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                        Previous
                    </button>
                    
                    <div className="d-flex gap-1">
                        {[...Array(totalPages)].map((_, i) => {
                            if (
                                i + 1 === 1 || 
                                i + 1 === totalPages || 
                                (i + 1 >= currentPage - 1 && i + 1 <= currentPage + 1)
                            ) {
                                return (
                                    <button 
                                        key={i} 
                                        className={`btn-page-number ${currentPage === i + 1 ? 'active' : ''}`}
                                        onClick={() => setCurrentPage(i + 1)}
                                    >
                                        {i + 1}
                                    </button>
                                );
                            } else if (
                                (i + 1 === currentPage - 2 && i + 1 > 1) || 
                                (i + 1 === currentPage + 2 && i + 1 < totalPages)
                            ) {
                                return <span key={i} className="text-muted px-1 align-self-end">...</span>;
                            }
                            return null;
                        })}
                    </div>

                    <button 
                        className="btn-page-nav" 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>
        )}
      </div>
    );
  };

  const wrapperClass = mobileMode 
    ? (sidebarOpen ? "toggled" : "") 
    : (sidebarOpen ? "" : "toggled");

  return (
    <div className={`d-flex wrapper ${wrapperClass}`} id="wrapper">
      
      {/* SIDEBAR */}
      <div id="sidebar-wrapper">
        <div className="sidebar-heading">
              <span className="sidebar-title">
                <span className="gradient-text">SIGNATURE</span> ADMIN
              </span>
          <button className="btn-close-sidebar" onClick={toggleSidebar}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="list-group list-group-flush mt-3">
          <button 
            className={`list-group-item list-group-item-action ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => { setActiveTab('users'); if(mobileMode) setSidebarOpen(false); }}
          >
            <i className="fas fa-chart-pie"></i> Overview
          </button>

          <button 
            className={`list-group-item list-group-item-action list-group-item-success-tab ${activeTab === 'success' ? 'active' : ''}`}
            onClick={() => { setActiveTab('success'); if(mobileMode) setSidebarOpen(false); }}
          >
            <i className="fas fa-check-circle"></i> Success Requests
          </button>

          <button 
            className={`list-group-item list-group-item-action list-group-item-failure-tab ${activeTab === 'failure' ? 'active' : ''}`}
            onClick={() => { setActiveTab('failure'); if(mobileMode) setSidebarOpen(false); }}
          >
            <i className="fas fa-exclamation-circle"></i> Failed Requests
          </button>
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div id="page-content-wrapper">
        <nav className="navbar-custom d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            {(!sidebarOpen || mobileMode) && (
                <button className="btn btn-outline-secondary btn-sm me-3" onClick={toggleSidebar} style={{border: '1px solid #0069d9', color: '#0069d9'}}>
                  <i className="fas fa-bars"></i>
                </button>
            )}
            <h4 className="m-0 fw-bold dashboard-heading">
              {activeTab === 'users' && 'Dashboard Overview'}
              {activeTab === 'success' && 'Successful Analysis'}
              {activeTab === 'failure' && 'Failed Analysis'}
            </h4>
          </div>
          <button className="btn btn-logout shadow-sm" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> LOGOUT
          </button>
        </nav>

        <div className="container-fluid px-4 py-4">
          {activeTab === 'users' && (
            <div className="row g-4">
              {/* STATS CARDS */}
              <div className="col-12 col-md-4">
                <div className="stats-card card-style-users">
                  <div className="card-content">
                    <div className="text-start"> 
                      <div className="card-title text-primary-custom">TOTAL REQUESTS</div>
                      <div className="card-value text-primary-custom">{stats.total}</div>
                    </div>
                    <i className="fas fa-layer-group card-icon-large text-primary-custom"></i>
                  </div>
                </div>
              </div>
              
              <div className="col-12 col-md-4">
                <div 
                  className="stats-card card-style-success" 
                  onClick={() => setActiveTab('success')} 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-content">
                    <div className="text-start"> 
                      <div className="card-title text-success-custom">SUCCESS</div>
                      <div className="card-value text-success-custom">{stats.success}</div>
                    </div>
                    <i className="fas fa-check-circle card-icon-large text-success-custom"></i>
                  </div>
                </div>
              </div>
              
              <div className="col-12 col-md-4">
                <div 
                  className="stats-card card-style-failure" 
                  onClick={() => setActiveTab('failure')} 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-content">
                    <div className="text-start"> 
                      <div className="card-title text-danger-custom">FAILURES</div>
                      <div className="card-value text-danger-custom">{stats.failure}</div>
                    </div>
                    <i className="fas fa-times-circle card-icon-large text-danger-custom"></i>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'success' && renderTable(successData, 'success')}
          {activeTab === 'failure' && renderTable(failureData, 'failure')}
        </div>
      </div>

      {/* --- TEXT VIEWING MODAL --- */}
      {viewTextModal.isOpen && (
        <div className="admin-modal-overlay">
            <div className="admin-modal-card">
                <div className="admin-modal-header">
                    <h5 className="m-0 text-primary">Analysis for: {viewTextModal.userName}</h5>
                    <button className="btn-close-modal" onClick={closeTextModal}>&times;</button>
                </div>
                <div className="admin-modal-body">
                    <p>{viewTextModal.text}</p>
                </div>
                <div className="admin-modal-footer">
                    <button className="btn btn-secondary" onClick={closeTextModal}>Close</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;