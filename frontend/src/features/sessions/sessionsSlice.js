// src/features/sessions/sessionsSlice.js   (TRAINEE-side slice → store key "traineeSessions")
//
// API integration for the trainee /trainee/sessions page.
// Only two calls are needed here: list the trainee's sessions, and join a live one.
//
// FIXES vs the old version:
//   • JWT is read from redux state.auth.token (the app persists auth via redux-persist,
//     so localStorage.getItem('token') was usually null → 401 on every request).
//   • Calls the trainee endpoints that actually exist & are role-correct:
//       GET  /api/trainee/sessions
//       POST /api/trainee/sessions/:id/join   → { token, url, roomName, role }
//   • Dropped create/update/delete/enroll (they pointed at unmounted routes and the
//     trainee page never used them).
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// '' → relative URL; goes through CRA's  "proxy": "http://localhost:8080"
const API = process.env.REACT_APP_API_BASE_URL || '';

const authHeader = (getState) => ({
  headers: { Authorization: `Bearer ${getState().auth?.token || ''}` },
});

// GET /api/trainee/sessions  → sessions for the trainee's batch OR ones they're enrolled in
export const fetchSessions = createAsyncThunk(
  'traineeSessions/fetchSessions',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${API}/api/trainee/sessions`, {
        ...authHeader(getState),
        params,
      });
      // Accept { sessions: [] } | { data: [] } | bare array
      return Array.isArray(data) ? data : data.sessions || data.data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch sessions');
    }
  }
);

// POST /api/trainee/sessions/:id/join  → LiveKit connection for the room
export const joinSession = createAsyncThunk(
  'traineeSessions/joinSession',
  async ({ id, passcode } = {}, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${API}/api/trainee/sessions/${id}/join`,
        { passcode },
        authHeader(getState)
      );
      // data = { success, token, url, roomName, role:'student' }
      return { id, token: data.token, url: data.url, roomName: data.roomName, role: data.role };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Could not join session');
    }
  }
);

const traineeSessionsSlice = createSlice({
  name: 'traineeSessions',
  initialState: {
    items: [],
    status: 'idle',       // idle | loading | succeeded | failed
    error: null,

    connection: null,     // { id, token, url, roomName, role } from the last join
    joinStatus: 'idle',
    joinError: null,
  },
  reducers: {
    clearConnection(state) {
      state.connection = null;
      state.joinStatus = 'idle';
      state.joinError = null;
    },
    clearSessionError(state) {
      state.error = null;
      state.joinError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessions.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      .addCase(joinSession.pending, (state) => {
        state.joinStatus = 'loading';
        state.joinError = null;
      })
      .addCase(joinSession.fulfilled, (state, action) => {
        state.joinStatus = 'succeeded';
        state.connection = action.payload;
      })
      .addCase(joinSession.rejected, (state, action) => {
        state.joinStatus = 'failed';
        state.joinError = action.payload;
      });
  },
});

export const { clearConnection, clearSessionError } = traineeSessionsSlice.actions;

// ── Selectors (read the dedicated traineeSessions key; optional-chained) ──────
export const selectSessions       = (s) => s.traineeSessions?.items ?? [];
export const selectSessionsStatus = (s) => s.traineeSessions?.status ?? 'idle';
export const selectSessionsError  = (s) => s.traineeSessions?.error ?? null;
export const selectConnection     = (s) => s.traineeSessions?.connection ?? null;
export const selectJoinStatus     = (s) => s.traineeSessions?.joinStatus ?? 'idle';
export const selectJoinError      = (s) => s.traineeSessions?.joinError ?? null;

export default traineeSessionsSlice.reducer;