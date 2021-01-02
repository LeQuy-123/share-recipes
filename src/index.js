import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import 'react-calendar/dist/Calendar.css';

import App from './App';
import { Provider } from 'react-redux';
import * as serviceWorker from './serviceWorker';
import { BrowserRouter } from 'react-router-dom';
import {persistor, store} from './redux/store'
import { PersistGate } from 'redux-persist/integration/react';
ReactDOM.render(
 <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter basename={window.location.pathname || ''}>
          <App />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
