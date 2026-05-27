import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// ── Async Thunks ──────────────────────────────────────────────────────────────

export const fetchTraineeDashboard = createAsyncThunk(
  'trainee/fetchTraineeDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get('/api/trainee/dashboard', getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch trainee dashboard');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const traineeSlice = createSlice({
  name: 'trainee',
  initialState: {
    dashboard: null,
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTraineeDashboard.pending,   (state)         => { state.status = 'loading'; state.error = null; })
      .addCase(fetchTraineeDashboard.fulfilled, (state, action) => { state.status = 'succeeded'; state.dashboard = action.payload; })
      .addCase(fetchTraineeDashboard.rejected,  (state, action) => { state.status = 'failed'; state.error = action.payload; });
  },
});

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectTraineeDashboard = (state) => state.trainee.dashboard;
export const selectTraineeStatus    = (state) => state.trainee.status;
export const selectTraineeError     = (state) => state.trainee.error;

export default traineeSlice.reducer;