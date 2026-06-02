import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from 'redux';

import authReducer        from '../features/auth/authSlice';
import adminReducer       from '../features/admin/adminSlice';
import hrReducer          from '../features/hr/hrSlice';
import traineeReducer     from '../features/trainee/traineeSlice';
import trainerReducer     from '../features/Trainer/trainerSlice';
import sessionsReducer    from '../features/session/sessionsSlice';
import assignmentsReducer from '../features/assignment/assignmentsSlice';
import batchReducer from '../features/session/batchSlice';
import courseReducer      from '../features/admin/courseSlice';   // ← REQUIRED for Courses page

// Persist only auth so the user stays logged in on page refresh
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['token', 'user', 'isAuthenticated'],
};

const rootReducer = combineReducers({
  auth:        persistReducer(authPersistConfig, authReducer),
  admin:       adminReducer,
  hr:          hrReducer,
  trainee:     traineeReducer,
  trainer:     trainerReducer,
  sessions:    sessionsReducer,
  assignments: assignmentsReducer,
  batches: batchReducer,
    courses:     courseReducer,     // ← key 'courses' must match selector: s.courses.*
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist actions are non-serializable — ignore them
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PURGE'],
      },
    }),
});

export const persistor = persistStore(store);

export default store;