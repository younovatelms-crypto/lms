import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { store } from '../../app/store';
import {
  fetchUsers,
  fetchBatches,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  selectAdminUsers,
  selectAdminUsersStatus,
  selectAdminBatches,
} from '../../features/admin/adminSlice';

const UserManagement = () => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectAdminUsers);
  const status = useAppSelector(selectAdminUsersStatus);
  const batches = useAppSelector(selectAdminBatches);
  const authToken = useAppSelector(state => state.auth.token); // Get auth token

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchBatches());
  }, [dispatch]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(search.toLowerCase()) || 
                         user.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await dispatch(toggleUserStatus({ userId, isActive: !currentStatus })).unwrap();
      showToast(`User ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
    } catch (err) {
      showToast('Failed to update user status', 'error');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Delete ${userName}?`)) {
      try {
        await dispatch(deleteUser(userId)).unwrap();
        showToast(`User deleted successfully`);
      } catch (err) {
        showToast('Failed to delete user', 'error');
      }
    }
  };

  const handleSaveUser = async (userData) => {
    console.log('handleSaveUser called with:', { editingUser, userData }); // Debug log
    
    try {
      if (editingUser) {
        // For editing, we need a valid user ID
        const userId = editingUser._id || editingUser.id;
        console.log('Attempting to update user with ID:', userId);
        
        if (!userId) {
          showToast('Error: No user ID found for editing', 'error');
          return;
        }
        
        // Get token from Redux state
        const token = authToken || localStorage.getItem('token') || sessionStorage.getItem('token');
        
        // Make direct API call instead of using Redux
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        console.log('Direct API response:', result);
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to update user');
        }
        
        // Refresh the users list
        dispatch(fetchUsers());
        showToast('User updated successfully');
      } else {
        console.log('Creating new user');
        await dispatch(createUser(userData)).unwrap();
        showToast('User created successfully');
      }
      
      setShowModal(false);
      setEditingUser(null);
    } catch (err) {
      console.error('Save user error:', err);
      showToast(err.message || 'Failed to save user', 'error');
    }
  };

  if (status === 'loading') {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div>Loading users...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: window.innerWidth <= 768 ? '8px 12px 12px 12px' : '12px 16px 16px 16px', 
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#F8FAFC',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ marginBottom: window.innerWidth <= 768 ? 12 : 16, flexShrink: 0 }}>
        <h1 style={{ 
          fontSize: window.innerWidth <= 768 ? 18 : 22, 
          fontWeight: 700, 
          color: '#1E293B', 
          margin: '0 0 3px'
        }}>
          User & Role Management
        </h1>
        <p style={{ 
          fontSize: window.innerWidth <= 768 ? 11 : 13, 
          color: '#64748B', 
          margin: 0 
        }}>
          Manage platform users, roles, and YBLP mentor assignments
        </p>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 16,
        flexWrap: 'wrap',
        flexShrink: 0,
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: window.innerWidth <= 768 ? 8 : 16, 
          alignItems: 'center',
          flexWrap: 'wrap',
          width: window.innerWidth <= 768 ? '100%' : 'auto'
        }}>
          <input
            type="text"
            placeholder={window.innerWidth <= 768 ? "Search..." : "Search by name / email..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: window.innerWidth <= 768 ? '10px 12px' : '12px 16px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              fontSize: 14,
              width: window.innerWidth <= 768 ? '100%' : 280,
              outline: 'none'
            }}
          />
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: window.innerWidth <= 768 ? '10px 12px' : '12px 16px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              fontSize: 14,
              outline: 'none',
              background: '#fff',
              width: window.innerWidth <= 768 ? '100%' : 'auto'
            }}
          >
            <option>All Roles</option>
            <option>Trainer</option>
            <option>Trainee</option>
            <option>HR</option>
          </select>

          <select
            style={{
              padding: window.innerWidth <= 768 ? '10px 12px' : '12px 16px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              fontSize: 14,
              outline: 'none',
              background: '#fff',
              width: window.innerWidth <= 768 ? '100%' : 'auto'
            }}
          >
            <option>All Programs</option>
            <option>YIEP</option>
            <option>YBLP</option>
            <option>Both</option>
          </select>
        </div>

        <button
          onClick={() => {
            setEditingUser(null);
            setShowModal(true);
          }}
          style={{
            padding: window.innerWidth <= 768 ? '10px 16px' : '12px 24px',
            background: '#1E40AF',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            width: window.innerWidth <= 768 ? '100%' : 'auto'
          }}
        >
          + Create User
        </button>
      </div>

      {/* Users Table */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: window.innerWidth <= 768 ? 'auto' : 'hidden',
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '16px',
        minHeight: '500px'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          flex: 1,
          minWidth: window.innerWidth <= 768 ? '800px' : 'auto'
        }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
              <th style={{ 
                padding: '12px 16px', 
                textAlign: 'left', 
                fontSize: 12, 
                fontWeight: 600, 
                color: '#64748B', 
                textTransform: 'uppercase'
              }}>NAME</th>
              <th style={{ 
                padding: '12px 16px', 
                textAlign: 'left', 
                fontSize: 12, 
                fontWeight: 600, 
                color: '#64748B', 
                textTransform: 'uppercase'
              }}>EMAIL</th>
              <th style={{ 
                padding: '12px 16px', 
                textAlign: 'left', 
                fontSize: 12, 
                fontWeight: 600, 
                color: '#64748B', 
                textTransform: 'uppercase'
              }}>ROLE</th>
              <th style={{ 
                padding: '12px 16px', 
                textAlign: 'left', 
                fontSize: 12, 
                fontWeight: 600, 
                color: '#64748B', 
                textTransform: 'uppercase'
              }}>PROGRAM</th>
              <th style={{ 
                padding: '12px 16px', 
                textAlign: 'left', 
                fontSize: 12, 
                fontWeight: 600, 
                color: '#64748B', 
                textTransform: 'uppercase'
              }}>BATCH</th>
              <th style={{ 
                padding: '12px 16px', 
                textAlign: 'left', 
                fontSize: 12, 
                fontWeight: 600, 
                color: '#64748B', 
                textTransform: 'uppercase'
              }}>STATUS</th>
              <th style={{ 
                padding: '12px 16px', 
                textAlign: 'center', 
                fontSize: 12, 
                fontWeight: 600, 
                color: '#64748B', 
                textTransform: 'uppercase'
              }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.map((user, index) => (
              <tr key={user._id || user.id || index} style={{ 
                borderBottom: '1px solid #E2E8F0',
                background: index % 2 === 0 ? '#fff' : '#FAFBFC',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F1F5F9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#FAFBFC';
              }}>
                <td style={{ 
                  padding: window.innerWidth <= 768 ? '6px 10px' : '10px 14px', 
                  fontSize: window.innerWidth <= 768 ? 12 : 13, 
                  fontWeight: 500, 
                  color: '#1E293B',
                  height: '45px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${user.role === 'trainer' ? '#3B82F6, #1D4ED8' : user.role === 'trainee' ? '#8B5CF6, #7C3AED' : '#10B981, #059669'})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span>{user.name || '—'}</span>
                  </div>
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: 14, 
                  color: '#64748B',
                  height: '50px'
                }}>
                  {user.email || '—'}
                </td>
                <td style={{ 
                  padding: '12px 16px',
                  height: '50px'
                }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 600,
                    background: user.role === 'trainer' ? '#DBEAFE' : user.role === 'trainee' ? '#EDE9FE' : '#DCFCE7',
                    color: user.role === 'trainer' ? '#1D4ED8' : user.role === 'trainee' ? '#7C3AED' : '#16A34A',
                    border: `1px solid ${user.role === 'trainer' ? '#BFDBFE' : user.role === 'trainee' ? '#DDD6FE' : '#BBF7D0'}`
                  }}>
                    {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'N/A'}
                  </span>
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: 14, 
                  color: '#64748B',
                  height: '50px'
                }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    background: '#EEF2FF',
                    color: '#3730A3',
                    border: '1px solid #C7D2FE'
                  }}>
                    YIEP
                  </span>
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: 14, 
                  color: '#64748B',
                  height: '50px'
                }}>
                  {/* {user.batchId?.name ? (
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 500,
                      background: '#F0F9FF',
                      color: '#0369A1',
                      border: '1px solid #BAE6FD'
                    }}>
                      {user.batchId.name}
                    </span>
                  ) : (
                    <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Not assigned</span>
                  )} */}
                  {user.batchIds?.length > 0 ? (
  <span style={{
    padding: '4px 8px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 500,
    background: '#F0F9FF',
    color: '#0369A1',
    border: '1px solid #BAE6FD'
  }}>
    {user.batchIds.map(batch => batch.name).join(', ')}
  </span>
) : (
  <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>
    Not assigned
  </span>
)}
                </td>
                <td style={{ 
                  padding: '12px 16px',
                  height: '50px'
                }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 600,
                    background: user.isActive ? '#DCFCE7' : '#FEF3C7',
                    color: user.isActive ? '#16A34A' : '#D97706',
                    border: `1px solid ${user.isActive ? '#BBF7D0' : '#FDE68A'}`
                  }}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: window.innerWidth <= 768 ? '6px 10px' : '10px 14px', textAlign: 'center', height: '45px' }}>
                  <div style={{ display: 'flex', gap: window.innerWidth <= 768 ? 4 : 8, justifyContent: 'center', flexWrap: window.innerWidth <= 768 ? 'wrap' : 'nowrap' }}>
                    <button
                      onClick={() => {
                        const userWithId = {
                          ...user,
                          _id: user._id || user.id
                        };
                        setEditingUser(userWithId);
                        setShowModal(true);
                      }}
                      title="Edit user"
                      style={{
                        padding: window.innerWidth <= 768 ? '6px 8px' : '8px 12px',
                        background: '#F8FAFC',
                        color: '#475569',
                        border: '1px solid #E2E8F0',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: window.innerWidth <= 768 ? '11px' : '12px',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#E2E8F0';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#F8FAFC';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      {window.innerWidth <= 768 ? '✏️' : '✏️ Edit'}
                    </button>
                    
                    <button
                      onClick={() => handleToggleStatus(user._id || user.id || `temp-${index}`, user.isActive)}
                      title={user.isActive ? 'Disable user' : 'Enable user'}
                      style={{
                        padding: window.innerWidth <= 768 ? '6px 8px' : '8px 12px',
                        background: user.isActive ? '#FEF2F2' : '#F0FDF4',
                        color: user.isActive ? '#DC2626' : '#16A34A',
                        border: `1px solid ${user.isActive ? '#FECACA' : '#BBF7D0'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: window.innerWidth <= 768 ? '11px' : '12px',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      {user.isActive ? '❌' : '✅'}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteUser(user._id || user.id || `temp-${index}`, user.name)}
                      title="Delete user"
                      style={{
                        padding: window.innerWidth <= 768 ? '6px 8px' : '8px 12px',
                        background: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: window.innerWidth <= 768 ? '11px' : '12px',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#FCA5A5';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#FEF2F2';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* Fill remaining space with empty rows only when there's data */}
            {currentUsers.length > 0 && Array.from({ length: Math.max(0, 10 - currentUsers.length) }, (_, i) => (
              <tr key={`empty-${i}`} style={{ 
                background: (currentUsers.length + i) % 2 === 0 ? '#fff' : '#FAFBFC',
                height: '45px'
              }}>
                <td colSpan={7} style={{ padding: '10px 14px', height: '45px', border: 'none' }}></td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: '#64748B',
            fontSize: '14px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <h3 style={{ margin: '0 0 8px', color: '#1E293B' }}>No users found</h3>
            <p style={{ margin: 0 }}>Try adjusting your search criteria or create a new user.</p>
          </div>
        )}
      </div>

      {/* Fixed Pagination */}
      {filteredUsers.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          flexShrink: 0
        }}>
          <div style={{ fontSize: '14px', color: '#64748B' }}>
            Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                background: currentPage === 1 ? '#F8FAFC' : '#fff',
                color: currentPage === 1 ? '#94A3B8' : '#475569',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ← Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                const distance = Math.abs(page - currentPage);
                return distance <= 2 || page === 1 || page === totalPages;
              })
              .map((page, index, array) => {
                const prevPage = array[index - 1];
                const showEllipsis = prevPage && page - prevPage > 1;
                
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && (
                      <span style={{ padding: '8px 4px', color: '#94A3B8' }}>...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(page)}
                      style={{
                        padding: '8px 12px',
                        background: currentPage === page ? '#3B82F6' : '#fff',
                        color: currentPage === page ? '#fff' : '#475569',
                        border: `1px solid ${currentPage === page ? '#3B82F6' : '#E2E8F0'}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: currentPage === page ? '600' : '400',
                        cursor: 'pointer',
                        minWidth: '40px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                background: currentPage === totalPages ? '#F8FAFC' : '#fff',
                color: currentPage === totalPages ? '#94A3B8' : '#475569',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <UserModal
          user={editingUser}
          batches={batches}
          onClose={() => {
            setShowModal(false);
            setEditingUser(null);
          }}
          onSave={handleSaveUser}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: toast.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          color: toast.type === 'error' ? '#DC2626' : '#16A34A',
          border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
          borderRadius: 8,
          padding: '12px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1001
        }}>
          {toast.message}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Custom scrollbar styles */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #F1F5F9;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
      `}</style>
    </div>
  );
};

const UserModal = ({ user, batches, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'trainee',
    password: '',
    // batchId: user?.batchId?._id || user?.batchId || '' // Handle both object and string
    batchId: user?.batchIds?.[0]?._id || ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Debug log to see user structure
  console.log('UserModal user object:', user);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }
    
    if (!user && !formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (!user && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    const submitData = { ...formData,batchIds: formData.batchId ? [formData.batchId] : [] };
    if (user && !submitData.password) {
      delete submitData.password;
    }
    
    try {
      await onSave(submitData);
    } catch (err) {
      console.error('Form submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: window.innerWidth <= 768 ? '20px' : '0'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: window.innerWidth <= 768 ? 16 : 24,
        width: '100%',
        maxWidth: window.innerWidth <= 768 ? '100%' : 500,
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h3 style={{ margin: '0 0 20px', fontSize: window.innerWidth <= 768 ? 16 : 18, fontWeight: 600 }}>
          {user ? 'Edit User' : 'Create New User'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: window.innerWidth <= 768 ? 13 : 14, fontWeight: 500 }}>
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              style={{
                width: '100%',
                padding: window.innerWidth <= 768 ? '8px 10px' : '10px 12px',
                border: `1px solid ${errors.name ? '#DC2626' : '#E2E8F0'}`,
                borderRadius: 8,
                fontSize: window.innerWidth <= 768 ? 13 : 14,
                outline: 'none'
              }}
            />
            {errors.name && (
              <div style={{ color: '#DC2626', fontSize: window.innerWidth <= 768 ? 11 : 12, marginTop: 4 }}>
                {errors.name}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: window.innerWidth <= 768 ? 13 : 14, fontWeight: 500 }}>
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              style={{
                width: '100%',
                padding: window.innerWidth <= 768 ? '8px 10px' : '10px 12px',
                border: `1px solid ${errors.email ? '#DC2626' : '#E2E8F0'}`,
                borderRadius: 8,
                fontSize: window.innerWidth <= 768 ? 13 : 14,
                outline: 'none'
              }}
            />
            {errors.email && (
              <div style={{ color: '#DC2626', fontSize: window.innerWidth <= 768 ? 11 : 12, marginTop: 4 }}>
                {errors.email}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: window.innerWidth <= 768 ? 13 : 14, fontWeight: 500 }}>
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              style={{
                width: '100%',
                padding: window.innerWidth <= 768 ? '8px 10px' : '10px 12px',
                border: `1px solid ${errors.role ? '#DC2626' : '#E2E8F0'}`,
                borderRadius: 8,
                fontSize: window.innerWidth <= 768 ? 13 : 14,
                outline: 'none',
                background: '#fff'
              }}
            >
              <option value="">Select Role</option>
              <option value="trainee">Trainee</option>
              <option value="trainer">Trainer</option>
              <option value="hr">HR</option>
            </select>
            {errors.role && (
              <div style={{ color: '#DC2626', fontSize: window.innerWidth <= 768 ? 11 : 12, marginTop: 4 }}>
                {errors.role}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: window.innerWidth <= 768 ? 13 : 14, fontWeight: 500 }}>
              Batch
            </label>
            <select
              value={formData.batchId}
              onChange={(e) => handleInputChange('batchId', e.target.value)}
              style={{
                width: '100%',
                padding: window.innerWidth <= 768 ? '8px 10px' : '10px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: window.innerWidth <= 768 ? 13 : 14,
                outline: 'none',
                background: '#fff'
              }}
            >
              <option value="">Select Batch</option>
              {batches?.map(batch => (
                <option key={batch._id} value={batch._id}>{batch.name}</option>
              ))}
            </select>
          </div>

          {!user && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: window.innerWidth <= 768 ? 13 : 14, fontWeight: 500 }}>
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                style={{
                  width: '100%',
                  padding: window.innerWidth <= 768 ? '8px 10px' : '10px 12px',
                  border: `1px solid ${errors.password ? '#DC2626' : '#E2E8F0'}`,
                  borderRadius: 8,
                  fontSize: window.innerWidth <= 768 ? 13 : 14,
                  outline: 'none'
                }}
              />
              {errors.password && (
                <div style={{ color: '#DC2626', fontSize: window.innerWidth <= 768 ? 11 : 12, marginTop: 4 }}>
                  {errors.password}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24, flexDirection: window.innerWidth <= 768 ? 'column' : 'row' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: window.innerWidth <= 768 ? '12px 20px' : '10px 20px',
                background: 'transparent',
                color: '#64748B',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                width: window.innerWidth <= 768 ? '100%' : 'auto'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: window.innerWidth <= 768 ? '12px 20px' : '10px 20px',
                background: loading ? '#94A3B8' : '#1E40AF',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'center',
                width: window.innerWidth <= 768 ? '100%' : 'auto'
              }}
            >
              {loading && (
                <div style={{
                  width: 16,
                  height: 16,
                  border: '2px solid transparent',
                  borderTop: '2px solid #fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              {loading ? 'Saving...' : (user ? 'Update' : 'Create')} User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;