import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// ── Async Thunks ──────────────────────────────────────────────────────────────

export const fetchAssignments = createAsyncThunk(
  'assignments/fetchAssignments',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get('/api/assignments', getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch assignments');
    }
  }
);

export const createAssignment = createAsyncThunk(
  'assignments/createAssignment',
  async (assignmentData, { rejectWithValue }) => {
    try {
      const res = await axios.post('/api/assignments', assignmentData, getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create assignment');
    }
  }
);

export const submitAssignment = createAsyncThunk(
  'assignments/submitAssignment',
  async ({ id, submissionData }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`/api/assignments/${id}/submit`, submissionData, getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to submit assignment');
    }
  }
);

export const gradeAssignment = createAsyncThunk(
  'assignments/gradeAssignment',
  async ({ id, gradeData }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`/api/assignments/${id}/grade`, gradeData, getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to grade assignment');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const assignmentsSlice = createSlice({
  name: 'assignments',
  initialState: {
    assignments: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssignments.pending,   (state)         => { state.status = 'loading'; state.error = null; })
      .addCase(fetchAssignments.fulfilled, (state, action) => { state.status = 'succeeded'; state.assignments = action.payload; })
      .addCase(fetchAssignments.rejected,  (state, action) => { state.status = 'failed'; state.error = action.payload; })

      .addCase(createAssignment.fulfilled, (state, action) => { state.assignments.push(action.payload); })

      .addCase(submitAssignment.fulfilled, (state, action) => {
        const idx = state.assignments.findIndex((a) => a._id === action.payload._id);
        if (idx !== -1) state.assignments[idx] = action.payload;
      })

      .addCase(gradeAssignment.fulfilled, (state, action) => {
        const idx = state.assignments.findIndex((a) => a._id === action.payload._id);
        if (idx !== -1) state.assignments[idx] = action.payload;
      });
  },
});

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectAllAssignments    = (state) => state.assignments.assignments;
export const selectAssignmentsStatus = (state) => state.assignments.status;
export const selectAssignmentsError  = (state) => state.assignments.error;

export default assignmentsSlice.reducer;