// src/pages/admin/Registrations.jsx
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { 
  fetchRegistrations, 
  convertLead, 
  createRegistration,
  updateRegistration,
  deleteRegistration,
  selectAllRegistrations 
} from '../../features/admin/adminSlice';
import toast from 'react-hot-toast';

const AddLeadModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    programInterest: 'YIEP',
    source: 'web'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    // Full Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.fullName.trim())) {
      newErrors.fullName = 'Full name can only contain letters and spaces';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation (optional but if provided, must be valid)
    if (formData.phone.trim()) {
      const phoneRegex = /^[+]?[1-9]?[0-9]{7,15}$/;
      if (!phoneRegex.test(formData.phone.replace(/[\s()-]/g, ''))) {
        newErrors.phone = 'Please enter a valid phone number (7-15 digits)';
      }
    }

    // Program Interest validation
    if (!formData.programInterest) {
      newErrors.programInterest = 'Program interest is required';
    }

    // Source validation
    if (!formData.source) {
      newErrors.source = 'Source is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim()
      });
      
      // Reset form on success
      setFormData({ 
        fullName: '', 
        email: '', 
        phone: '', 
        programInterest: 'YIEP', 
        source: 'web' 
      });
      setErrors({});
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleClose = () => {
    setFormData({ 
      fullName: '', 
      email: '', 
      phone: '', 
      programInterest: 'YIEP', 
      source: 'web' 
    });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

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
      padding: '16px'
    }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: window.innerWidth < 640 ? '16px' : '24px', 
        width: '100%', 
        maxWidth: '400px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>Add New Lead</h3>
        
        <form onSubmit={handleSubmit}>
          {/* Full Name Field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px', 
              fontSize: '14px', 
              fontWeight: '500',
              color: errors.fullName ? '#dc2626' : '#374151'
            }}>
              Full Name *
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: `1px solid ${errors.fullName ? '#dc2626' : '#d1d5db'}`, 
                borderRadius: '6px', 
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              placeholder="Enter full name"
            />
            {errors.fullName && (
              <span style={{ 
                display: 'block', 
                marginTop: '4px', 
                fontSize: '12px', 
                color: '#dc2626' 
              }}>
                {errors.fullName}
              </span>
            )}
          </div>

          {/* Email Field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px', 
              fontSize: '14px', 
              fontWeight: '500',
              color: errors.email ? '#dc2626' : '#374151'
            }}>
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: `1px solid ${errors.email ? '#dc2626' : '#d1d5db'}`, 
                borderRadius: '6px', 
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              placeholder="Enter email address"
            />
            {errors.email && (
              <span style={{ 
                display: 'block', 
                marginTop: '4px', 
                fontSize: '12px', 
                color: '#dc2626' 
              }}>
                {errors.email}
              </span>
            )}
          </div>

          {/* Phone Field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px', 
              fontSize: '14px', 
              fontWeight: '500',
              color: errors.phone ? '#dc2626' : '#374151'
            }}>
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: `1px solid ${errors.phone ? '#dc2626' : '#d1d5db'}`, 
                borderRadius: '6px', 
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              placeholder="Enter phone number (optional)"
            />
            {errors.phone && (
              <span style={{ 
                display: 'block', 
                marginTop: '4px', 
                fontSize: '12px', 
                color: '#dc2626' 
              }}>
                {errors.phone}
              </span>
            )}
          </div>

          {/* Program Interest Field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px', 
              fontSize: '14px', 
              fontWeight: '500',
              color: errors.programInterest ? '#dc2626' : '#374151'
            }}>
              Program Interest *
            </label>
            <select
              value={formData.programInterest}
              onChange={(e) => handleInputChange('programInterest', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: `1px solid ${errors.programInterest ? '#dc2626' : '#d1d5db'}`, 
                borderRadius: '6px', 
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            >
              <option value="">Select program</option>
              <option value="YIEP">YIEP - Young India Employment Program</option>
              <option value="YBLP">YBLP - Young Business Leadership Program</option>
            </select>
            {errors.programInterest && (
              <span style={{ 
                display: 'block', 
                marginTop: '4px', 
                fontSize: '12px', 
                color: '#dc2626' 
              }}>
                {errors.programInterest}
              </span>
            )}
          </div>

          {/* Source Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px', 
              fontSize: '14px', 
              fontWeight: '500',
              color: errors.source ? '#dc2626' : '#374151'
            }}>
              Source *
            </label>
            <select
              value={formData.source}
              onChange={(e) => handleInputChange('source', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: `1px solid ${errors.source ? '#dc2626' : '#d1d5db'}`, 
                borderRadius: '6px', 
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            >
              <option value="">Select source</option>
              <option value="web">Website</option>
              <option value="referral">Referral</option>
              <option value="social">Social Media</option>
              <option value="direct">Direct Contact</option>
              <option value="other">Other</option>
            </select>
            {errors.source && (
              <span style={{ 
                display: 'block', 
                marginTop: '4px', 
                fontSize: '12px', 
                color: '#dc2626' 
              }}>
                {errors.source}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'flex-end',
            flexDirection: window.innerWidth < 480 ? 'column' : 'row'
          }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{ 
                padding: '8px 16px', 
                border: '1px solid #d1d5db', 
                background: 'white', 
                borderRadius: '6px', 
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ 
                padding: '8px 16px', 
                background: isSubmitting ? '#9ca3af' : '#2563eb', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {isSubmitting ? 'Adding...' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function AdminRegistrations() {
  const dispatch = useAppDispatch();
  const registrations = useAppSelector(selectAllRegistrations);
  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => { 
    dispatch(fetchRegistrations()).then(() => {
      console.log('Fetched registrations with status values');
    }); 
  }, [dispatch]);

  // Debug effect to log registrations when they change
  useEffect(() => {
    console.log('Registrations updated:', registrations);
    registrations.forEach((reg, index) => {
      console.log(`Registration ${index}:`, {
        name: reg.fullName || reg.name,
        status: reg.status,
        statusType: typeof reg.status
      });
    });
  }, [registrations]);

  const handleConvert = async (id) => {
    try {
      // Ensure id is a string, not an object
      const idString = typeof id === 'object' ? id._id || id.id : id;
      console.log('Converting lead with ID:', idString);
      const result = await dispatch(convertLead({ id: idString }));
      if (convertLead.fulfilled.match(result)) {
        toast.success('Lead converted to trainee');
        // Refresh the registrations list to show updated data
        dispatch(fetchRegistrations());
      } else {
        toast.error(result.payload || 'Failed to convert lead');
      }
    } catch (error) {
      console.error('Convert lead error:', error);
      toast.error('Failed to convert lead');
    }
  };

  const handleAddLead = async (formData) => {
    const result = await dispatch(createRegistration(formData));
    if (createRegistration.fulfilled.match(result)) {
      toast.success('Lead added successfully');
      setShowAddModal(false);
      dispatch(fetchRegistrations());
    } else {
      toast.error(result.payload || 'Failed to add lead');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      try {
        // Ensure id is a string, not an object
        const idString = typeof id === 'object' ? id._id || id.id : id;
        console.log('Deleting registration with ID:', idString, typeof idString);
        const result = await dispatch(deleteRegistration(idString));
        if (deleteRegistration.fulfilled.match(result)) {
          toast.success('Registration deleted successfully');
          dispatch(fetchRegistrations());
        } else {
          toast.error(result.payload || 'Failed to delete registration');
        }
      } catch (error) {
        console.error('Delete registration error:', error);
        toast.error('Failed to delete registration');
      }
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      // Ensure id is a string, not an object
      const idString = typeof id === 'object' ? id._id || id.id : id;
      console.log('Updating registration status:', idString, status);
      const result = await dispatch(updateRegistration({ id: idString, status }));
      if (updateRegistration.fulfilled.match(result)) {
        toast.success('Status updated');
        // Refresh the registrations list to show updated status
        dispatch(fetchRegistrations());
      } else {
        toast.error(result.payload || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    // Normalize status to handle case sensitivity and variations
    const normalizedStatus = status?.toLowerCase() || 'new';
    
    const styles = {
      registered: { bg: '#e3f2fd', color: '#1976d2', text: 'Registered' },
      contacted: { bg: '#fff3e0', color: '#f57c00', text: 'Contacted' },
      enrolled: { bg: '#e8f5e8', color: '#388e3c', text: 'Enrolled' },
      new: { bg: '#f3e5f5', color: '#7b1fa2', text: 'New' },
      pending: { bg: '#fce4ec', color: '#c2185b', text: 'Pending' },
      converted: { bg: '#f3e5f5', color: '#7b1fa2', text: 'New' }, // Handle 'converted' as 'New'
      lead: { bg: '#f3e5f5', color: '#7b1fa2', text: 'New' }, // Handle 'lead' as 'New'
    };
    
    const style = styles[normalizedStatus] || styles.new;
    return (
      <span style={{ 
        background: style.bg, 
        color: style.color, 
        padding: '4px 8px', 
        borderRadius: '12px', 
        fontSize: '11px', 
        fontWeight: '600' 
      }}>
        {style.text}
      </span>
    );
  };

  const getProgramBadge = (program) => {
    const isYBLP = program?.toLowerCase().includes('yblp');
    return (
      <span style={{
        background: isYBLP ? '#e3f2fd' : '#fff3e0',
        color: isYBLP ? '#1976d2' : '#f57c00',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600'
      }}>
        {program || 'YIEP'}
      </span>
    );
  };

  const getFilteredRegistrations = () => {
    console.log('=== FILTERING DEBUG ===');
    console.log('All registrations:', registrations);
    console.log('Active tab:', activeTab);
    
    if (activeTab === 'all') return registrations;
    
    const filtered = registrations.filter(r => {
      const regStatus = r.status;
      console.log('Raw status:', regStatus, 'Type:', typeof regStatus);
      
      // Handle status mapping - "converted" should be treated as "new"
      let normalizedStatus = regStatus;
      if (regStatus === 'converted') {
        normalizedStatus = 'new';
      }
      
      // Check exact match
      if (normalizedStatus === activeTab) {
        console.log('Exact match found');
        return true;
      }
      
      // Check case insensitive match
      const regStatusLower = String(normalizedStatus || '').toLowerCase();
      const filterStatusLower = activeTab.toLowerCase();
      
      console.log('Comparing:', regStatusLower, 'vs', filterStatusLower);
      
      if (regStatusLower === filterStatusLower) {
        console.log('Case insensitive match found');
        return true;
      }
      
      return false;
    });
    
    console.log('Filtered results:', filtered);
    console.log('=== END FILTERING DEBUG ===');
    return filtered;
  };

  const getTabCount = (status) => {
    if (status === 'all') return registrations.length;
    
    const count = registrations.filter(r => {
      const regStatus = r.status;
      
      // Handle status mapping - "converted" should be treated as "new"
      let normalizedStatus = regStatus;
      if (regStatus === 'converted') {
        normalizedStatus = 'new';
      }
      
      // Check exact match
      if (normalizedStatus === status) return true;
      
      // Check case insensitive match
      const regStatusLower = String(normalizedStatus || '').toLowerCase();
      const filterStatusLower = status.toLowerCase();
      
      return regStatusLower === filterStatusLower;
    }).length;
    
    console.log(`Tab count for ${status}:`, count, 'from total:', registrations.length);
    return count;
  };

  const filteredData = getFilteredRegistrations();

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRegistrations = filteredData.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  return (
    <div style={{ 
      padding: window.innerWidth < 640 ? '8px 12px 12px 12px' : '12px 16px 16px 16px', 
      fontFamily: 'Inter, system-ui, sans-serif', 
      background: '#F8FAFC', 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ marginBottom: window.innerWidth < 640 ? 12 : 16, flexShrink: 0 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: window.innerWidth < 640 ? 'flex-start' : 'center', 
          marginBottom: '6px',
          flexDirection: window.innerWidth < 640 ? 'column' : 'row',
          gap: window.innerWidth < 640 ? '8px' : '0'
        }}>
          <h1 style={{ 
            fontSize: window.innerWidth < 640 ? '20px' : '24px', 
            fontWeight: '700', 
            color: '#1a202c', 
            margin: 0 
          }}>Registration & Lead Management</h1>
        </div>
        <p style={{ color: '#64748b', margin: 0, fontSize: '13px' }}>Lead capture → Registered → Enrolled → Active Trainee pipeline</p>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: window.innerWidth < 640 ? 'wrap' : 'nowrap'
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            background: '#f1f5f9', 
            padding: '4px', 
            borderRadius: '8px', 
            width: 'fit-content',
            flexWrap: window.innerWidth < 640 ? 'wrap' : 'nowrap',
            overflowX: window.innerWidth < 640 ? 'visible' : 'auto'
          }}>
            {[
              { key: 'all', label: 'All Leads', count: getTabCount('all') },
              { key: 'new', label: 'New', count: getTabCount('new') },
              { key: 'contacted', label: 'Contacted', count: getTabCount('contacted') },
              { key: 'registered', label: 'Registered', count: getTabCount('registered') },
              { key: 'enrolled', label: 'Enrolled', count: getTabCount('enrolled') }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: activeTab === tab.key ? '#334155' : 'transparent',
                  color: activeTab === tab.key ? 'white' : '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  padding: window.innerWidth < 640 ? '6px 8px' : '8px 12px',
                  fontSize: window.innerWidth < 640 ? '11px' : '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: window.innerWidth < 640 ? '8px 12px' : '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* Table */}
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
        {window.innerWidth < 1024 ? (
          // Mobile/Tablet Card Layout
          <div style={{ padding: '12px' }}>
            {currentRegistrations.map((registration) => (
              <div key={registration._id} style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                background: '#fafafa'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c', marginBottom: '4px' }}>
                    {registration.fullName || registration.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    {registration.phone || registration.email}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {getProgramBadge(registration.programInterest)}
                  {getStatusBadge(registration.status)}
                </div>
                
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                  <div>Source: {registration.source || 'Website'}</div>
                  <div>Date: {registration.createdAt ? new Date(registration.createdAt).toLocaleDateString('en-US', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: '2-digit' 
                  }) : '—'}</div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {registration.status === 'registered' ? (
                    <button 
                      onClick={() => handleConvert(registration._id)}
                      style={{
                        background: '#334155',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        flex: 1
                      }}
                    >
                      Convert to Trainee
                    </button>
                  ) : registration.status === 'enrolled' ? (
                    <span style={{ color: '#10b981', fontSize: '12px', fontWeight: '600', flex: 1 }}>Active Trainee</span>
                  ) : (
                    <select
                      value={registration.status}
                      onChange={(e) => handleUpdateStatus(registration._id, e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="enrolled">Enrolled</option>
                    </select>
                  )}
                  <button
                    onClick={() => handleDelete(registration._id, registration.fullName || registration.name)}
                    disabled={registration.status === 'enrolled'}
                    title="Delete registration"
                    style={{
                      padding: '8px',
                      background: registration.status === 'enrolled' ? '#F8FAFC' : '#FEF2F2',
                      color: registration.status === 'enrolled' ? '#94A3B8' : '#DC2626',
                      border: `1px solid ${registration.status === 'enrolled' ? '#E2E8F0' : '#FECACA'}`,
                      borderRadius: '6px',
                      cursor: registration.status === 'enrolled' ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      opacity: registration.status === 'enrolled' ? 0.5 : 1
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            {currentRegistrations.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                <h3 style={{ margin: '0 0 6px', color: '#1E293B', fontSize: '16px' }}>No {activeTab === 'all' ? 'leads' : activeTab} found</h3>
                <p style={{ margin: 0, fontSize: '13px' }}>Try adjusting your filters or add a new lead.</p>
              </div>
            )}
          </div>
        ) : (
          // Desktop Table Layout with horizontal scroll
          <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            flex: 1,
            minWidth: '900px'
          }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
              {['NAME', 'CONTACT', 'PROGRAM', 'SOURCE', 'STAGE', 'DATE', 'ACTIONS'].map((header, index) => (
                <th key={header} style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#64748b',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  minWidth: index === 0 ? '120px' : 
                           index === 1 ? '150px' : 
                           index === 2 ? '100px' :
                           index === 3 ? '80px' :
                           index === 4 ? '90px' :
                           index === 5 ? '90px' : '120px',
                  whiteSpace: 'nowrap'
                }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRegistrations.map((registration, index) => (
              <tr key={registration._id} style={{ 
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
                <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '500', color: '#1a202c', height: '50px' }}>
                  {registration.fullName || registration.name}
                </td>
                <td style={{ padding: '12px 14px', fontSize: '13px', color: '#64748b', height: '50px' }}>
                  {registration.phone || registration.email}
                </td>
                <td style={{ padding: '12px 14px', height: '50px' }}>
                  {getProgramBadge(registration.programInterest)}
                </td>
                <td style={{ padding: '12px 14px', fontSize: '13px', color: '#64748b', textTransform: 'capitalize', height: '50px' }}>
                  {registration.source || 'Website'}
                </td>
                <td style={{ padding: '12px 14px', height: '50px' }}>
                  {getStatusBadge(registration.status)}
                </td>
                <td style={{ padding: '12px 14px', fontSize: '13px', color: '#64748b', height: '50px' }}>
                  {registration.createdAt ? new Date(registration.createdAt).toLocaleDateString('en-US', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: '2-digit' 
                  }) : '—'}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'center', height: '50px' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                    {registration.status === 'registered' ? (
                      <button 
                        onClick={() => handleConvert(registration._id)}
                        style={{
                          background: '#334155',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Convert
                      </button>
                    ) : registration.status === 'enrolled' ? (
                      <span style={{ color: '#10b981', fontSize: '12px', fontWeight: '600' }}>Active Trainee</span>
                    ) : (
                      <select
                        value={registration.status}
                        onChange={(e) => handleUpdateStatus(registration._id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        {/* <option value="registered">Registered</option> */}
                        <option value="enrolled">Enrolled</option>
                      </select>
                    )}
                    <button
                      onClick={() => handleDelete(registration._id, registration.fullName || registration.name)}
                      disabled={registration.status === 'enrolled'}
                      title="Delete registration"
                      style={{
                        padding: '6px 8px',
                        background: registration.status === 'enrolled' ? '#F8FAFC' : '#FEF2F2',
                        color: registration.status === 'enrolled' ? '#94A3B8' : '#DC2626',
                        border: `1px solid ${registration.status === 'enrolled' ? '#E2E8F0' : '#FECACA'}`,
                        borderRadius: '6px',
                        cursor: registration.status === 'enrolled' ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        opacity: registration.status === 'enrolled' ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (registration.status !== 'enrolled') {
                          e.target.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
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
            {currentRegistrations.length > 0 && Array.from({ length: Math.max(0, 10 - currentRegistrations.length) }, (_, i) => (
              <tr key={`empty-${i}`} style={{ 
                background: (currentRegistrations.length + i) % 2 === 0 ? '#fff' : '#FAFBFC',
                height: '50px'
              }}>
                <td colSpan={7} style={{ padding: '12px 14px', height: '50px', border: 'none' }}></td>
              </tr>
            ))}
            {currentRegistrations.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b', border: 'none' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                  <h3 style={{ margin: '0 0 6px', color: '#1E293B', fontSize: '16px' }}>No {activeTab === 'all' ? 'leads' : activeTab} found</h3>
                  <p style={{ margin: 0, fontSize: '13px' }}>Try adjusting your filters or add a new lead.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
          </div>
        )}
      </div>

      {/* Fixed Pagination */}
      {filteredData.length > 0 && (
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
            Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} registrations
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

      <AddLeadModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onSubmit={handleAddLead} 
      />

      {/* Custom scrollbar styles */}
      <style>{`
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
}
