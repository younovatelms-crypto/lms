import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchAdminTrainees,
  fetchBatches,
  assignTraineesToBatch,
  selectAllAdminTrainees,
  selectAllBatches,
  selectAdminStatus,
  selectAdminError,
} from '../../features/admin/adminSlice';

const Trainees = () => {
  const dispatch = useAppDispatch();
  const isMobile = window.innerWidth <= 768;

  // Defensive defaults so a null/undefined slice never breaks the table.
  const trainees = useAppSelector(selectAllAdminTrainees) ?? [];
  const batches  = useAppSelector(selectAllBatches) ?? [];
  const status   = useAppSelector(selectAdminStatus);
  const error    = useAppSelector(selectAdminError);

  // Per-trainee batch modal
  const [batchModalTrainee, setBatchModalTrainee] = useState(null); // the trainee being edited
  const [chosenBatchIds, setChosenBatchIds]       = useState([]);   // batches to add
  const [pickerOpen, setPickerOpen]               = useState(false);// dropdown open/close
  const [assigning, setAssigning]                 = useState(false);
  const pickerRef = useRef(null);

  // Lightweight toast
  const [toast, setToast] = useState('');

  // Pagination
  const [page, setPage]               = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS (plain functions — safe to define anywhere)
  // ─────────────────────────────────────────────────────────────────────────

  // Set of batch-id strings a trainee currently belongs to.
  // Handles batchIds being raw ids OR populated { _id } objects.
  const currentBatchIdSet = (trainee) => {
    const raw = trainee?.batchIds || [];
    return new Set(raw.map((b) => String(b?._id || b)));
  };

  // [{ id, name }] for the batches a trainee is in (joined against the batches list).
  const getTraineeBatches = (trainee) => {
    const set = currentBatchIdSet(trainee);
    return batches
      .filter((b) => set.has(String(b._id)))
      .map((b) => ({ id: String(b._id), name: b.name }));
  };

  const openBatchModal = (trainee) => {
    setBatchModalTrainee(trainee);
    setChosenBatchIds([]);
    setPickerOpen(false);
  };

  const closeBatchModal = () => {
    setBatchModalTrainee(null);
    setChosenBatchIds([]);
    setPickerOpen(false);
  };

  const toggleChosen = (id) => {
    const key = String(id);
    setChosenBatchIds((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(''), 3000);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ALL HOOKS MUST RUN BEFORE ANY CONDITIONAL RETURN (Rules of Hooks).
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchAdminTrainees());
    dispatch(fetchBatches());
  }, [dispatch]);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, Math.ceil((trainees.length || 0) / rowsPerPage))));
  }, [trainees.length, rowsPerPage]);

  // Close the batch picker when clicking outside it.
  useEffect(() => {
    if (!pickerOpen) return undefined;
    const onDocClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pickerOpen]);

  const handleSaveBatches = async () => {
    if (!batchModalTrainee || chosenBatchIds.length === 0) return;

    setAssigning(true);
    try {
      // $addToSet on the backend → assign each chosen batch to this single trainee.
      await Promise.all(
        chosenBatchIds.map((batchId) =>
          dispatch(
            assignTraineesToBatch({ batchId, traineeIds: [batchModalTrainee._id] })
          ).unwrap()
        )
      );

      await dispatch(fetchAdminTrainees());

      showToast(
        `${batchModalTrainee.name} added to ${chosenBatchIds.length} batch${chosenBatchIds.length > 1 ? 'es' : ''}`
      );
      closeBatchModal();
    } catch (err) {
      alert(err || 'Failed to assign batches');
    } finally {
      setAssigning(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EARLY RETURNS (after all hooks)
  // ─────────────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div style={{ padding: isMobile ? '16px 20px' : '32px 36px', fontFamily: 'Inter, system-ui, sans-serif', background: '#F8FAFC', minHeight: '100vh' }}>
        <div style={{ height: 28, width: 220, marginBottom: 8, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', borderRadius: 8 }} />
        <div style={{ height: 14, width: 300, marginBottom: 28, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', borderRadius: 8 }} />
        <div style={{ height: 400, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', borderRadius: 16 }} />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div style={{ padding: isMobile ? '16px 20px' : '32px 36px', fontFamily: 'Inter, system-ui, sans-serif', background: '#F8FAFC', minHeight: '100vh' }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 20 }}>
          <p style={{ color: '#B91C1C', fontWeight: 600, margin: '0 0 4px' }}>Error loading trainees</p>
          <p style={{ color: '#B91C1C', fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED PAGINATION VALUES (declared ONCE, after the early returns)
  // ─────────────────────────────────────────────────────────────────────────

  const totalTrainees = trainees.length;
  const totalPages = Math.max(1, Math.ceil(totalTrainees / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const paginatedTrainees = trainees.slice(startIdx, endIdx);

  // For the open modal: which batches are still addable (not already assigned).
  const currentSet      = batchModalTrainee ? currentBatchIdSet(batchModalTrainee) : new Set();
  const currentBatches  = batchModalTrainee ? getTraineeBatches(batchModalTrainee) : [];
  const addableBatches  = batches.filter((b) => !currentSet.has(String(b._id)));

  const thStyle = {
    padding: isMobile ? '8px 12px' : '12px 16px',
    textAlign: 'left',
    fontSize: isMobile ? 10 : 11,
    fontWeight: 700,
    color: '#64748B',
    letterSpacing: '0.7px',
    textTransform: 'uppercase',
    borderBottom: '1px solid #E2E8F0',
  };

  return (
    <div style={{ padding: isMobile ? '16px 20px' : '32px 36px', fontFamily: 'Inter, system-ui, sans-serif', background: '#F8FAFC', minHeight: '100vh' }}>
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, marginBottom: 6, color: '#0F172A', letterSpacing: '-0.5px' }}>
          Trainees ({trainees.length})
        </h1>
        <p style={{ margin: 0, color: '#64748B', fontSize: isMobile ? 13 : 14, fontWeight: 500 }}>
          Manage trainee profiles and assign them to one or more batches.
        </p>
      </div>

      {trainees.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 16, padding: isMobile ? 32 : 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(30,58,95,0.08)' }}>
          <p style={{ color: '#64748B', fontSize: isMobile ? 13 : 14, margin: 0 }}>No trainees found.</p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(30,58,95,0.08)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: isMobile ? '320px' : '460px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '620px' : '760px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Name</th>
                  <th style={{ ...thStyle, display: isMobile && window.innerWidth <= 480 ? 'none' : 'table-cell' }}>Email</th>
                  <th style={{ ...thStyle, display: window.innerWidth <= 600 ? 'none' : 'table-cell' }}>Batches</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedTrainees.map((trainee, idx) => {
                  const traineeBatches = getTraineeBatches(trainee);
                  return (
                    <tr key={trainee._id || idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: isMobile ? '8px 12px' : '12px 16px', fontSize: isMobile ? 12 : 13, color: '#64748B' }}>
                        {startIdx + idx + 1}
                      </td>
                      <td style={{ padding: isMobile ? '8px 12px' : '12px 16px', fontSize: isMobile ? 12 : 13, color: '#0F172A', fontWeight: 600 }}>
                        <div style={{ maxWidth: isMobile ? '120px' : 'none', overflow: isMobile ? 'hidden' : 'visible', textOverflow: isMobile ? 'ellipsis' : 'clip', whiteSpace: isMobile ? 'nowrap' : 'normal' }}>
                          {trainee.name || '—'}
                        </div>
                      </td>
                      <td style={{ padding: isMobile ? '8px 12px' : '12px 16px', fontSize: isMobile ? 12 : 13, color: '#64748B', display: window.innerWidth <= 480 ? 'none' : 'table-cell' }}>
                        <div style={{ maxWidth: isMobile ? '150px' : 'none', overflow: isMobile ? 'hidden' : 'visible', textOverflow: isMobile ? 'ellipsis' : 'clip', whiteSpace: isMobile ? 'nowrap' : 'normal' }}>
                          {trainee.email || '—'}
                        </div>
                      </td>

                      {/* ── BATCHES — one pill per batch ── */}
                      <td style={{ padding: isMobile ? '8px 12px' : '12px 16px', fontSize: isMobile ? 12 : 13, color: '#64748B', display: window.innerWidth <= 600 ? 'none' : 'table-cell' }}>
                        {traineeBatches.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 260 }}>
                            {traineeBatches.map((b) => (
                              <span key={b.id} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#DBEAFE', color: '#1E40AF', whiteSpace: 'nowrap' }}>
                                {b.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px' }}>Not Assigned</span>
                        )}
                      </td>

                      <td style={{ padding: isMobile ? '8px 12px' : '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: isMobile ? '2px 8px' : '3px 10px', borderRadius: 999, fontSize: isMobile ? 10 : 11, fontWeight: 700, background: trainee.isActive ? '#DCFCE7' : '#F1F5F9', color: trainee.isActive ? '#15803D' : '#475569' }}>
                          {trainee.isActive ? 'Active' : 'In-Active'}
                        </span>
                      </td>

                      {/* ── ACTIONS — open the per-trainee batch picker ── */}
                      <td style={{ padding: isMobile ? '8px 12px' : '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => openBatchModal(trainee)}
                          style={{ padding: isMobile ? '6px 10px' : '7px 14px', borderRadius: 8, border: '1px solid #3B82F6', background: '#EFF6FF', color: '#1D4ED8', fontSize: isMobile ? 12 : 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          Manage Batches
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginator */}
          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid #E2E8F0', background: '#fff', flexWrap: 'wrap' }}>
            <div style={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}>
              Page <span style={{ color: '#0F172A' }}>{safePage}</span> of <span style={{ color: '#0F172A' }}>{totalPages}</span>
              <span style={{ fontWeight: 500 }}> · {totalTrainees} total</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}>Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', fontWeight: 700, color: '#0F172A' }}
                >
                  {[5, 10, 15, 20].map((n) => (<option key={n} value={n}>{n}</option>))}
                </select>
              </div>

              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
                style={{ padding: '8px 12px', background: safePage <= 1 ? '#F8FAFC' : '#fff', color: safePage <= 1 ? '#94A3B8' : '#475569', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '14px', cursor: safePage <= 1 ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                ← Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => { const distance = Math.abs(p - safePage); return distance <= 2 || p === 1 || p === totalPages; })
                .map((p, i, arr) => {
                  const prevPage = arr[i - 1];
                  const showEllipsis = prevPage && p - prevPage > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span style={{ padding: '8px 4px', color: '#94A3B8' }}>...</span>}
                      <button onClick={() => setPage(p)}
                        style={{ padding: '8px 12px', background: safePage === p ? '#3B82F6' : '#fff', color: safePage === p ? '#fff' : '#475569', border: `1px solid ${safePage === p ? '#3B82F6' : '#E2E8F0'}`, borderRadius: '6px', fontSize: '14px', fontWeight: safePage === p ? '600' : '400', cursor: 'pointer', minWidth: '40px', transition: 'all 0.2s' }}>
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                style={{ padding: '8px 12px', background: safePage >= totalPages ? '#F8FAFC' : '#fff', color: safePage >= totalPages ? '#94A3B8' : '#475569', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '14px', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PER-TRAINEE BATCH MODAL with multi-select dropdown ── */}
      {batchModalTrainee && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={closeBatchModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'white', borderRadius: 16, padding: isMobile ? '20px 18px' : 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Manage Batches
              </h2>
              <button onClick={closeBatchModal} style={{ background: 'none', border: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>✕</button>
            </div>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 18 }}>
              {batchModalTrainee.name} — <span style={{ color: '#94A3B8' }}>{batchModalTrainee.email}</span>
            </p>

            {/* Current batches */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                Currently in
              </label>
              {currentBatches.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {currentBatches.map((b) => (
                    <span key={b.id} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#DBEAFE', color: '#1E40AF' }}>
                      {b.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ color: '#94A3B8', fontSize: 13 }}>Not assigned to any batch yet.</span>
              )}
            </div>

            {/* Multi-select dropdown */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                Add to batches
              </label>

              {addableBatches.length === 0 ? (
                <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
                  This trainee is already in every batch.
                </p>
              ) : (
                <div ref={pickerRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setPickerOpen((o) => !o)}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', fontSize: 14, color: chosenBatchIds.length ? '#0F172A' : '#9CA3AF', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
                  >
                    <span>
                      {chosenBatchIds.length === 0
                        ? 'Select batches…'
                        : `${chosenBatchIds.length} batch${chosenBatchIds.length > 1 ? 'es' : ''} selected`}
                    </span>
                    <span style={{ color: '#9CA3AF', transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
                  </button>

                  {pickerOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 12px 28px rgba(15,23,42,0.12)', maxHeight: 240, overflowY: 'auto', zIndex: 20, padding: 6 }}>
                      {addableBatches.map((batch) => {
                        const checked = chosenBatchIds.includes(String(batch._id));
                        return (
                          <label
                            key={batch._id}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', background: checked ? '#EFF6FF' : 'transparent', fontSize: 14, color: '#0F172A' }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleChosen(String(batch._id))}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#3B82F6' }}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{batch.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Chosen-to-add preview pills */}
              {chosenBatchIds.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {chosenBatchIds.map((id) => {
                    const b = batches.find((x) => String(x._id) === String(id));
                    return (
                      <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px 3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#DCFCE7', color: '#15803D' }}>
                        {b ? b.name : id}
                        <button onClick={() => toggleChosen(id)} style={{ background: 'none', border: 'none', color: '#15803D', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>✕</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                onClick={closeBatchModal}
                disabled={assigning}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#374151', fontSize: 14, fontWeight: 600, cursor: assigning ? 'not-allowed' : 'pointer', opacity: assigning ? 0.5 : 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBatches}
                disabled={assigning || chosenBatchIds.length === 0}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#3B82F6', color: 'white', fontSize: 14, fontWeight: 600, cursor: (assigning || chosenBatchIds.length === 0) ? 'not-allowed' : 'pointer', opacity: (assigning || chosenBatchIds.length === 0) ? 0.5 : 1 }}
              >
                {assigning
                  ? 'Saving…'
                  : `Add to ${chosenBatchIds.length || ''} batch${chosenBatchIds.length === 1 ? '' : 'es'}`.trim()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '12px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: '0 10px 30px rgba(15,23,42,0.25)', zIndex: 2000 }}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default Trainees;