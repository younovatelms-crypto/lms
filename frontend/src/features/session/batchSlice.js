// src/features/session/batchSlice.js
//
// ─── ROLE BEHAVIOUR ───────────────────────────────────────────────────────────
// This slice hits GET /api/batches which is role-aware on the backend:
//
//   role = admin   → returns ALL batches (no filter)
//   role = trainer → returns only batches where trainerId = req.user._id
//   role = trainee → returns only the batch they belong to
//
// The frontend does NOT filter by role — the backend handles it.
// One dispatch(fetchBatches()) call works for every role.
// ─────────────────────────────────────────────────────────────────────────────

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// ─── Auth header — state.auth.token (same pattern as adminSlice) ──────────────
const authHeader = (getState) => ({
  headers: { Authorization: `Bearer ${getState().auth.token}` },
});

// ─── Role selector helper (used inside thunks) ────────────────────────────────
const getRole = (getState) => getState().auth?.user?.role || '';

//════════════════════════════════════════════════════════
// THUNKS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/batches
// Response: { success, data: { batches:[{_id,name,description,trainerId:{_id,name,email},
//             startDate,maxStudents,status,course,tags,createdAt,updatedAt}],
//             meta:{total,page,limit,pages} } }
//
// Role behaviour (handled by backend, not frontend):
//   admin   → all batches
//   trainer → own batches (filter.trainerId = req.user._id)
//   trainee → their batch
export const fetchBatches = createAsyncThunk(
  'batches/fetchBatches',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.token;
      const role = getState().auth?.user?.role;

      console.log('Role:', role);
      console.log('Token:', token);

      const response = await axios.get(
        `${API}/api/batches`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params,
        }
      );

      console.log('API Response:', response.data);

      return response.data;
    } catch (err) {
      console.error('Batch Fetch Error:', err.response?.data);

      return rejectWithValue(
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch batches'
      );
    }
  }
);
// GET /api/batches/:id
// Response: { success, data: { batch:{...}, students:[{name,email,placementStatus}] } }
export const fetchBatchById = createAsyncThunk(
  'batches/fetchBatchById',
  async (id, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${API}/api/batches/${id}`,
        authHeader(getState)
      );
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to fetch batch'
      );
    }
  }
);

// POST /api/batches  [admin only — backend enforces authorize('admin')]
// Body:     { name, description, trainerId, startDate, maxStudents, course, status }
// Response: { success: true, data: { _id, name, ... } }
export const createBatch = createAsyncThunk(
  'batches/createBatch',
  async (batchData, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${API}/api/batches`,
        batchData,
        authHeader(getState)
      );
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to create batch'
      );
    }
  }
);

// PUT /api/batches/:id  [admin only]
// Body:     any updatable batch fields
// Response: { success: true, data: { ...updatedBatch } }
export const updateBatch = createAsyncThunk(
  'batches/updateBatch',
  async ({ id, ...batchData }, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.put(
        `${API}/api/batches/${id}`,
        batchData,
        authHeader(getState)
      );
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to update batch'
      );
    }
  }
);

// DELETE /api/batches/:id  [admin only]
// Response: { success: true, message: 'Batch deleted' }
export const deleteBatch = createAsyncThunk(
  'batches/deleteBatch',
  async (id, { getState, rejectWithValue }) => {
    try {
      await axios.delete(`${API}/api/batches/${id}`, authHeader(getState));
      return id;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to delete batch'
      );
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// SLICE
// ═══════════════════════════════════════════════════════════════════════════════

const batchSlice = createSlice({
  name: 'batches',

  initialState: {
    // List
    batches:         [],
    meta:            { total: 0, page: 1, limit: 0, pages: 1 },
    status:          'idle',   // idle | loading | succeeded | failed
    error:           null,

    // Single batch detail
    currentBatch:    null,
    currentStudents: [],
    detailStatus:    'idle',
    detailError:     null,

    // Create  [admin]
    createStatus:    'idle',
    createError:     null,

    // Update  [admin]
    updateStatus:    'idle',
    updateError:     null,

    // Delete  [admin]
    deleteStatus:    'idle',
    deleteError:     null,
  },

  reducers: {
    clearBatchErrors(state) {
      state.error       = null;
      state.detailError = null;
      state.createError = null;
      state.updateError = null;
      state.deleteError = null;
    },
    resetBatchCreateStatus(state) {
      state.createStatus = 'idle';
      state.createError  = null;
    },
  },

  extraReducers: (builder) => {

    // ── fetchBatches ───────────────────────────────────────────────────────────
    // payload = { success, data: { batches:[...], meta:{...} } }
    builder
      .addCase(fetchBatches.pending,   (s)    => { s.status = 'loading';   s.error = null; })
      .addCase(fetchBatches.fulfilled, (s, a) => {
        s.status  = 'succeeded';
        s.batches = a.payload?.data?.batches || [];
        s.meta    = a.payload?.data?.meta    || s.meta;
      })
      .addCase(fetchBatches.rejected,  (s, a) => { s.status = 'failed';    s.error = a.payload; });

    // ── fetchBatchById ─────────────────────────────────────────────────────────
    builder
      .addCase(fetchBatchById.pending,   (s)    => { s.detailStatus = 'loading';   s.detailError = null; })
      .addCase(fetchBatchById.fulfilled, (s, a) => {
        s.detailStatus    = 'succeeded';
        s.currentBatch    = a.payload?.data?.batch    || null;
        s.currentStudents = a.payload?.data?.students || [];
      })
      .addCase(fetchBatchById.rejected,  (s, a) => { s.detailStatus = 'failed'; s.detailError = a.payload; });

    // ── createBatch ────────────────────────────────────────────────────────────
    builder
      .addCase(createBatch.pending,   (s)    => { s.createStatus = 'loading';   s.createError = null; })
      .addCase(createBatch.fulfilled, (s, a) => {
        s.createStatus = 'succeeded';
        const nb = a.payload?.data || a.payload;
        if (nb?._id) { s.batches.unshift(nb); s.meta.total += 1; }
      })
      .addCase(createBatch.rejected,  (s, a) => { s.createStatus = 'failed'; s.createError = a.payload; });

    // ── updateBatch ────────────────────────────────────────────────────────────
    builder
      .addCase(updateBatch.pending,   (s)    => { s.updateStatus = 'loading';   s.updateError = null; })
      .addCase(updateBatch.fulfilled, (s, a) => {
        s.updateStatus = 'succeeded';
        const updated = a.payload?.data || a.payload;
        if (updated?._id) {
          const i = s.batches.findIndex(b => b._id === updated._id);
          if (i !== -1) s.batches[i] = updated;
          if (s.currentBatch?._id === updated._id) s.currentBatch = updated;
        }
      })
      .addCase(updateBatch.rejected,  (s, a) => { s.updateStatus = 'failed'; s.updateError = a.payload; });

    // ── deleteBatch ────────────────────────────────────────────────────────────
    builder
      .addCase(deleteBatch.pending,   (s)    => { s.deleteStatus = 'loading';   s.deleteError = null; })
      .addCase(deleteBatch.fulfilled, (s, a) => {
        s.deleteStatus = 'succeeded';
        s.batches      = s.batches.filter(b => b._id !== a.payload);
        s.meta.total   = Math.max(0, s.meta.total - 1);
      })
      .addCase(deleteBatch.rejected,  (s, a) => { s.deleteStatus = 'failed'; s.deleteError = a.payload; });

  },
});

// ─── Actions ──────────────────────────────────────────────────────────────────
export const { clearBatchErrors, resetBatchCreateStatus } = batchSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

// List selectors
export const selectAllBatches        = (s) => s.batches.batches;
export const selectBatchesMeta       = (s) => s.batches.meta;
export const selectBatchesStatus     = (s) => s.batches.status;
export const selectBatchesError      = (s) => s.batches.error;

// Derived — name strings only  → ['Batch 2026-A', 'Batch 2026-B']
export const selectBatchNames        = (s) => s.batches.batches.map(b => b.name).filter(Boolean);

// Derived — option objects for <select> when _id is needed for API
// → [{ value:'6a16dc4c...', label:'Batch 2026-A', course:'YIEP', status:'upcoming' }]
export const selectBatchOptions      = (s) =>
  s.batches.batches.map(b => ({
    value:  b._id,
    label:  b.name,
    course: b.course  || '',
    status: b.status  || '',
  }));

// Single batch detail
export const selectCurrentBatch      = (s) => s.batches.currentBatch;
export const selectCurrentStudents   = (s) => s.batches.currentStudents;
export const selectBatchDetailStatus = (s) => s.batches.detailStatus;
export const selectBatchDetailError  = (s) => s.batches.detailError;

// Mutation statuses
export const selectBatchCreateStatus = (s) => s.batches.createStatus;
export const selectBatchCreateError  = (s) => s.batches.createError;
export const selectBatchUpdateStatus = (s) => s.batches.updateStatus;
export const selectBatchUpdateError  = (s) => s.batches.updateError;
export const selectBatchDeleteStatus = (s) => s.batches.deleteStatus;
export const selectBatchDeleteError  = (s) => s.batches.deleteError;

export default batchSlice.reducer;