import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// ── Async Thunks ──────────────────────────────────────────────────────────────

export const fetchSessions = createAsyncThunk(
  'sessions/fetchSessions',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get('/api/sessions', getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch sessions');
    }
  }
);

export const createSession = createAsyncThunk(
  'sessions/createSession',
  async (sessionData, { rejectWithValue }) => {
    try {
      const res = await axios.post('/api/sessions', sessionData, getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create session');
    }
  }
);

export const updateSession = createAsyncThunk(
  'sessions/updateSession',
  async ({ id, ...sessionData }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`/api/sessions/${id}`, sessionData, getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update session');
    }
  }
);

export const deleteSession = createAsyncThunk(
  'sessions/deleteSession',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/sessions/${id}`, getAuthHeader());
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete session');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState: {
    sessions: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessions.pending,   (state)         => { state.status = 'loading'; state.error = null; })
      .addCase(fetchSessions.fulfilled, (state, action) => { state.status = 'succeeded'; state.sessions = action.payload; })
      .addCase(fetchSessions.rejected,  (state, action) => { state.status = 'failed'; state.error = action.payload; })

      .addCase(createSession.fulfilled, (state, action) => { state.sessions.push(action.payload); })

      .addCase(updateSession.fulfilled, (state, action) => {
        const idx = state.sessions.findIndex((s) => s._id === action.payload._id);
        if (idx !== -1) state.sessions[idx] = action.payload;
      })

      .addCase(deleteSession.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter((s) => s._id !== action.payload);
      });
  },
});

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectAllSessions  = (state) => state.sessions.sessions;
export const selectSessionsStatus = (state) => state.sessions.status;
export const selectSessionsError  = (state) => state.sessions.error;

export default sessionsSlice.reducer;