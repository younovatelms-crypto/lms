import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export const fetchTrainerDashboard = createAsyncThunk(
  'trainer/fetchTrainerDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get('/api/trainer/dashboard', getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch trainer dashboard');
    }
  }
);

const trainerSlice = createSlice({
  name: 'trainer',
  initialState: { dashboard: null, status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrainerDashboard.pending,   (state)         => { state.status = 'loading'; state.error = null; })
      .addCase(fetchTrainerDashboard.fulfilled, (state, action) => { state.status = 'succeeded'; state.dashboard = action.payload; })
      .addCase(fetchTrainerDashboard.rejected,  (state, action) => { state.status = 'failed';   state.error = action.payload; });
  },
});

export const selectTrainerDashboard = (state) => state.trainer.dashboard;
export const selectTrainerStatus    = (state) => state.trainer.status;
export const selectTrainerError     = (state) => state.trainer.error;

export default trainerSlice.reducer;