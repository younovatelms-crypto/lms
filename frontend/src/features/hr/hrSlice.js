import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// ── Async Thunks ──────────────────────────────────────────────────────────────

export const fetchHrDashboard = createAsyncThunk(
  'hr/fetchHrDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get('/api/hr/dashboard', getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch HR dashboard');
    }
  }
);

export const fetchHrTrainees = createAsyncThunk(
  'hr/fetchHrTrainees',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get('/api/hr/trainees', getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch trainees');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const hrSlice = createSlice({
  name: 'hr',
  initialState: {
    dashboard: null,
    trainees: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHrDashboard.pending,   (state)         => { state.status = 'loading'; state.error = null; })
      .addCase(fetchHrDashboard.fulfilled, (state, action) => { state.status = 'succeeded'; state.dashboard = action.payload; })
      .addCase(fetchHrDashboard.rejected,  (state, action) => { state.status = 'failed'; state.error = action.payload; })

      .addCase(fetchHrTrainees.pending,   (state)         => { state.status = 'loading'; state.error = null; })
      .addCase(fetchHrTrainees.fulfilled, (state, action) => { 
        state.status = 'succeeded'; 
        state.trainees = action.payload.trainees || action.payload; 
      })
      .addCase(fetchHrTrainees.rejected,  (state, action) => { state.status = 'failed'; state.error = action.payload; });
  },
});

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectHrDashboard = (state) => state.hr.dashboard;
export const selectHrTrainees  = (state) => state.hr.trainees;
export const selectHrStatus    = (state) => state.hr.status;
export const selectHrError     = (state) => state.hr.error;

export default hrSlice.reducer;