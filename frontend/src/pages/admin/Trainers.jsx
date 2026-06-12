import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchTrainers,
  fetchBatches,
  assignTrainerToBatch,
  selectAllTrainers,
  selectAllBatches,
  selectAdminStatus,
  selectAdminError,
} from '../../features/admin/adminSlice';

const Trainers = () => {
  const dispatch = useAppDispatch();
  const trainers = useAppSelector(selectAllTrainers);
  const batches = useAppSelector(selectAllBatches);
  const status = useAppSelector(selectAdminStatus);
  const error = useAppSelector(selectAdminError);
  const [selectedTrainers, setSelectedTrainers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);


  useEffect(() => {
    dispatch(fetchTrainers());
    dispatch(fetchBatches());
  }, [dispatch]);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, Math.ceil((trainers.length || 0) / rowsPerPage))));
  }, [trainers.length, rowsPerPage]);

  const handleTrainerSelect = (trainerId) => {
    setSelectedTrainers(prev => 
      prev.includes(trainerId) 
        ? prev.filter(id => id !== trainerId)
        : [...prev, trainerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTrainers.length === trainers.length) {
      setSelectedTrainers([]);
    } else {
      setSelectedTrainers(trainers.map(t => t._id));
    }
  };

  const handleAssignToBatch = async () => {
    if (!selectedBatch || selectedTrainers.length === 0) {
      alert('Please select a batch and trainers');
      return;
    }

    if (selectedTrainers.length > 1) {
      alert('Only one trainer can be assigned to a batch at a time');
      return;
    }

    setAssigning(true);
    try {
      const result = await dispatch(assignTrainerToBatch({ 
        trainerId: selectedTrainers[0], 
        batchId: selectedBatch 
      })).unwrap();
      
      console.log('Assignment result:', result);
      
      // Show success toast
      const selectedBatchData = batches.find(b => b._id === selectedBatch);
      
      const toastDiv = document.createElement('div');
      toastDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10B981;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
      `;
      toastDiv.textContent = `Trainer assigned to ${selectedBatchData?.name || 'batch'} successfully!`;
      
      if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(toastDiv);
      
      setTimeout(() => {
        toastDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
          if (document.body.contains(toastDiv)) {
            document.body.removeChild(toastDiv);
          }
        }, 300);
      }, 3000);
      
      // Reset selections and close modal
      setSelectedTrainers([]);
      setSelectedBatch('');
      setShowModal(false);
      
    } catch (err) {
      console.error('Assignment error:', err);
      alert(err || 'Failed to assign trainer');
    } finally {
      setAssigning(false);
    }
  };



  if (status === 'loading') {
    return (
      <div style={{ 
        padding: window.innerWidth <= 768 ? '16px 20px' : '32px 36px', 
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#F8FAFC',
        minHeight: '100vh'
      }}>
        <div style={{ height: 28, width: 220, marginBottom: 8, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', borderRadius: 8 }} />
        <div style={{ height: 14, width: 300, marginBottom: 28, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', borderRadius: 8 }} />
        <div style={{ height: 400, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', borderRadius: 16 }} />
      </div>
    );
  }

  const totalTrainers = trainers.length;
  const totalPages = Math.max(1, Math.ceil(totalTrainers / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const paginatedTrainers = trainers.slice(startIdx, endIdx);

  if (status === 'failed') {
    return (

      <div style={{ 
        padding: window.innerWidth <= 768 ? '16px 20px' : '32px 36px', 
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#F8FAFC',
        minHeight: '100vh'
      }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 20 }}>
          <p style={{ color: '#B91C1C', fontWeight: 600, margin: '0 0 4px' }}>Error loading trainers</p>
          <p style={{ color: '#B91C1C', fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: window.innerWidth <= 768 ? '16px 20px' : '32px 36px', 
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#F8FAFC',
      minHeight: '100vh'
    }}>
      <div style={{ 
        marginBottom: window.innerWidth <= 768 ? 20 : 28,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ 
            fontSize: window.innerWidth <= 768 ? 22 : 28, 
            fontWeight: 800, 
            marginBottom: 6, 
            color: '#0F172A',
            letterSpacing: '-0.5px'
          }}>
            Trainers ({trainers.length})
          </h1>
          <p style={{ 
            margin: 0, 
            color: '#64748B', 
            fontSize: window.innerWidth <= 768 ? 13 : 14,
            fontWeight: 500
          }}>
            Manage trainer profiles and their specializations.
          </p>
        </div>
        {selectedTrainers.length > 0 && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#059669',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            Assign to Batch ({selectedTrainers.length})
          </button>
        )}
      </div>

      {trainers.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: window.innerWidth <= 768 ? 32 : 48,
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(30,58,95,0.08)',
        }}>
          <p style={{ color: '#64748B', fontSize: window.innerWidth <= 768 ? 13 : 14, margin: 0 }}>No trainers found.</p>
        </div>
      ) : (
        <div style={{
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(30,58,95,0.08)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto', maxHeight: window.innerWidth <= 768 ? '320px' : '460px', overflowY: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              minWidth: window.innerWidth <= 768 ? '800px' : '900px'
            }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ 
                    padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                    textAlign: 'left', 
                    fontSize: window.innerWidth <= 768 ? 10 : 11, 
                    fontWeight: 700, 
                    color: '#64748B', 
                    letterSpacing: '0.7px', 
                    textTransform: 'uppercase', 
                    borderBottom: '1px solid #E2E8F0',
                    width: '40px'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedTrainers.length === trainers.length && trainers.length > 0}
                      onChange={handleSelectAll}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer'
                      }}
                    />
                  </th>
                  <th style={{ 
                    padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                    textAlign: 'left', 
                    fontSize: window.innerWidth <= 768 ? 10 : 11, 
                    fontWeight: 700, 
                    color: '#64748B', 
                    letterSpacing: '0.7px', 
                    textTransform: 'uppercase', 
                    borderBottom: '1px solid #E2E8F0' 
                  }}>#</th>
                  <th style={{ 
                    padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                    textAlign: 'left', 
                    fontSize: window.innerWidth <= 768 ? 10 : 11, 
                    fontWeight: 700, 
                    color: '#64748B', 
                    letterSpacing: '0.7px', 
                    textTransform: 'uppercase', 
                    borderBottom: '1px solid #E2E8F0' 
                  }}>Name</th>
                  <th style={{ 
                    padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                    textAlign: 'left', 
                    fontSize: window.innerWidth <= 768 ? 10 : 11, 
                    fontWeight: 700, 
                    color: '#64748B', 
                    letterSpacing: '0.7px', 
                    textTransform: 'uppercase', 
                    borderBottom: '1px solid #E2E8F0',
                    display: window.innerWidth <= 480 ? 'none' : 'table-cell'
                  }}>Email</th>
                  <th style={{ 
                    padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                    textAlign: 'left', 
                    fontSize: window.innerWidth <= 768 ? 10 : 11, 
                    fontWeight: 700, 
                    color: '#64748B', 
                    letterSpacing: '0.7px', 
                    textTransform: 'uppercase', 
                    borderBottom: '1px solid #E2E8F0',
                    display: window.innerWidth <= 600 ? 'none' : 'table-cell'
                  }}>Specialization</th>
                  <th style={{ 
                    padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                    textAlign: 'left', 
                    fontSize: window.innerWidth <= 768 ? 10 : 11, 
                    fontWeight: 700, 
                    color: '#64748B', 
                    letterSpacing: '0.7px', 
                    textTransform: 'uppercase', 
                    borderBottom: '1px solid #E2E8F0',
                    display: window.innerWidth <= 768 ? 'none' : 'table-cell'
                  }}>Assigned Batch</th>
                  <th style={{ 
                    padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                    textAlign: 'left', 
                    fontSize: window.innerWidth <= 768 ? 10 : 11, 
                    fontWeight: 700, 
                    color: '#64748B', 
                    letterSpacing: '0.7px', 
                    textTransform: 'uppercase', 
                    borderBottom: '1px solid #E2E8F0' 
                  }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrainers.map((trainer, idx) => (
                  <tr key={trainer._id || idx} style={{ 
                    borderBottom: '1px solid #E2E8F0',
                    backgroundColor: selectedTrainers.includes(trainer._id) ? '#F0F9FF' : 'transparent'
                  }}>

                    <td style={{ 
                      padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px',
                      borderBottom: '1px solid #E2E8F0'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedTrainers.includes(trainer._id)}
                        onChange={() => handleTrainerSelect(trainer._id)}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer'
                        }}
                      />
                    </td>
                    <td style={{ 
                      padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px',
                      fontSize: window.innerWidth <= 768 ? 12 : 13,
                      color: '#64748B',
                      borderBottom: '1px solid #E2E8F0'
                    }}>{startIdx + idx + 1}</td>

                    <td style={{ 
                      padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                      fontSize: window.innerWidth <= 768 ? 12 : 13, 
                      color: '#0F172A', 
                      fontWeight: 600,
                      borderBottom: '1px solid #E2E8F0'
                    }}>
                      <div style={{
                        maxWidth: window.innerWidth <= 768 ? '120px' : 'none',
                        overflow: window.innerWidth <= 768 ? 'hidden' : 'visible',
                        textOverflow: window.innerWidth <= 768 ? 'ellipsis' : 'clip',
                        whiteSpace: window.innerWidth <= 768 ? 'nowrap' : 'normal'
                      }}>
                        {trainer.name || '—'}
                      </div>
                    </td>
                    <td style={{ 
                      padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                      fontSize: window.innerWidth <= 768 ? 12 : 13, 
                      color: '#64748B',
                      display: window.innerWidth <= 480 ? 'none' : 'table-cell',
                      borderBottom: '1px solid #E2E8F0'
                    }}>
                      <div style={{
                        maxWidth: window.innerWidth <= 768 ? '150px' : 'none',
                        overflow: window.innerWidth <= 768 ? 'hidden' : 'visible',
                        textOverflow: window.innerWidth <= 768 ? 'ellipsis' : 'clip',
                        whiteSpace: window.innerWidth <= 768 ? 'nowrap' : 'normal'
                      }}>
                        {trainer.email || '—'}
                      </div>
                    </td>
                    <td style={{ 
                      padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                      fontSize: window.innerWidth <= 768 ? 12 : 13, 
                      color: '#64748B',
                      display: window.innerWidth <= 600 ? 'none' : 'table-cell',
                      borderBottom: '1px solid #E2E8F0'
                    }}>{trainer.specialization || '—'}</td>
                    <td style={{ 
                      padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                      fontSize: window.innerWidth <= 768 ? 12 : 13, 
                      color: '#0F172A',
                      display: window.innerWidth <= 768 ? 'none' : 'table-cell',
                      verticalAlign: 'top',
                      borderBottom: '1px solid #E2E8F0'
                    }}>
                      {trainer.assignedBatches && trainer.assignedBatches.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {trainer.assignedBatches.map((batch, idx) => (
                            <span key={idx} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: '#DBEAFE',
                              color: '#1E40AF'
                            }}>
                              {batch.name}
                            </span>
                          ))}
                        </div>
                      ) : trainer.assignedBatchIds && trainer.assignedBatchIds.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {trainer.assignedBatchIds.map((batchId, idx) => {
                            const batch = batches.find(b => String(b._id) === String(batchId));
                            return (
                              <span key={idx} style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: '#DBEAFE',
                                color: '#1E40AF'
                              }}>
                                {batch ? batch.name : `ID: ${batchId}`}
                              </span>
                            );
                          })}
                        </div>
                      ) : trainer.batchId ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#DBEAFE',
                          color: '#1E40AF'
                        }}>
                          {(() => {
                            if (trainer.batchId && typeof trainer.batchId === 'object' && trainer.batchId.name) {
                              return trainer.batchId.name;
                            }
                            const batch = batches.find(b => String(b._id) === String(trainer.batchId));
                            return batch ? batch.name : `ID: ${trainer.batchId}`;
                          })()}
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '12px' }}>Not Assigned</span>
                      )}
                    </td>
                    <td style={{ 
                      padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px',
                      borderBottom: '1px solid #E2E8F0'
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: window.innerWidth <= 768 ? '2px 8px' : '3px 10px',
                        borderRadius: 999,
                        fontSize: window.innerWidth <= 768 ? 10 : 11,
                        fontWeight: 700,
                        background: trainer.status === 'active' ? '#DCFCE7' : '#F1F5F9',
                        color: trainer.status === 'active' ? '#15803D' : '#475569'
                      }}>
                        {trainer.status || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginator */}
          <div style={{
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            borderTop: '1px solid #E2E8F0',
            background: '#fff'
          }}>
            <div style={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}>
              Page <span style={{ color: '#0F172A' }}>{safePage}</span> of <span style={{ color: '#0F172A' }}>{totalPages}</span>
              <span style={{ fontWeight: 500 }}> · {totalTrainers} total</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}>Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #D1D5DB',
                    background: 'white',
                    fontWeight: 700,
                    color: '#0F172A'
                  }}
                >
                  {[5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                style={{
                  padding: '8px 12px',
                  background: safePage <= 1 ? '#F8FAFC' : '#fff',
                  color: safePage <= 1 ? '#94A3B8' : '#475569',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ← Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  const distance = Math.abs(p - safePage);
                  return distance <= 2 || p === 1 || p === totalPages;
                })
                .map((p, idx, arr) => {
                  const prevPage = arr[idx - 1];
                  const showEllipsis = prevPage && p - prevPage > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span style={{ padding: '8px 4px', color: '#94A3B8' }}>...</span>}
                      <button
                        onClick={() => setPage(p)}
                        style={{
                          padding: '8px 12px',
                          background: safePage === p ? '#3B82F6' : '#fff',
                          color: safePage === p ? '#fff' : '#475569',
                          border: `1px solid ${safePage === p ? '#3B82F6' : '#E2E8F0'}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: safePage === p ? '600' : '400',
                          cursor: 'pointer',
                          minWidth: '40px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                style={{
                  padding: '8px 12px',
                  background: safePage >= totalPages ? '#F8FAFC' : '#fff',
                  color: safePage >= totalPages ? '#94A3B8' : '#475569',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Batch Assignment Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#0F172A',
              marginBottom: '8px'
            }}>
              Assign Trainer to Batch
            </h2>
            <p style={{
              color: '#64748B',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              {selectedTrainers.length > 1 
                ? 'Please select only one trainer.' 
                : `You are assigning 1 trainer to a batch.`
              }
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px'
              }}>
                Select Batch
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                disabled={selectedTrainers.length > 1}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  outline: 'none',
                  opacity: selectedTrainers.length > 1 ? 0.5 : 1,
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}
              >
                <option value="">Choose a batch...</option>
                {batches.map(batch => (
                  <option key={batch._id} value={batch._id}>
                    {batch.name} ({batch.course})
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedBatch('');
                }}
                disabled={assigning}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: assigning ? 'not-allowed' : 'pointer',
                  opacity: assigning ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignToBatch}
                disabled={assigning || !selectedBatch || selectedTrainers.length > 1}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: (assigning || !selectedBatch || selectedTrainers.length > 1) ? 'not-allowed' : 'pointer',
                  opacity: (assigning || !selectedBatch || selectedTrainers.length > 1) ? 0.5 : 1
                }}
              >
                {assigning ? 'Assigning...' : 'Assign to Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trainers;