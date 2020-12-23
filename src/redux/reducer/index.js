/// Imports: Dependencies
import storage from 'redux-persist/lib/storage' 
import { combineReducers } from 'redux';
import { persistReducer } from 'redux-persist';
/// Imports: Reducers
import authReducer from './authReducer';
import searchReducer from './searchReducer';
import favoriteReducer from './favoriteReducer';
import settingReducer from './settingReducer';


/// Redux: Root Reducer
const reducers = combineReducers({
  authReducer: persistReducer(
    {
      key: 'authReducer',
      storage: storage,
    },
    authReducer,
  ),
   searchReducer: persistReducer(
    {
      key: 'searchReducer',
      storage: storage,
    },
    searchReducer,
  ),
   favoriteReducer: persistReducer(
    {
      key: 'favoriteReducer',
      storage: storage,
    },
    favoriteReducer,
  ),
 settingReducer: persistReducer(
    {
      key: 'settingReducer',
      storage: storage,
    },
    settingReducer,
  ),
});
// Exports
export default reducers;
