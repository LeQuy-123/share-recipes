import { applyMiddleware, createStore } from 'redux';
import { persistStore } from 'redux-persist';
import thunkMiddleware from 'redux-thunk';
import reducers from '../reducer';


const middlewares = [thunkMiddleware];

// create store

export const store = createStore(reducers, applyMiddleware(...middlewares));
export var persistor = persistStore(store, null);
