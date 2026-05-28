// src/index.js
// FIX: Original file had no Redux <Provider> or <PersistGate>.
// Store was configured but never injected, so all useSelector calls returned undefined.
import React    from 'react';
import ReactDOM from 'react-dom/client';
import { Provider }    from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './app/store';
import App from './App';
import './theme.css';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
