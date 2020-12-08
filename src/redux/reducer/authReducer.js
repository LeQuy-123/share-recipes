import { REDUX } from '../store/types';

// Initial State
const initialState = {
  loggedIn: false,
  userData: {},
  accessToken: '',
  refreshToken: '',
};
// Reducers (Modifies The State And Returns A New State)
const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case REDUX.CLEAR_DATA: {
      return initialState;
    }
    case REDUX.LOGIN: {
      return {
        ...state,
        loggedIn: !state.loggedIn,
      };
    }
    case REDUX.UPDATE_ACCESS_TOKEN: {
      return {
        ...state,
        accessToken: action.payload,
      };
    }
    case REDUX.UPDATE_REFRESH_TOKEN: {
      return {
        ...state,
        refreshToken: action.payload,
      };
    }
    case REDUX.UPDATE_USER_DATA: {
      return {
        ...state,
        userData: action.payload,
      };
    }
    default: {
      return state;
    }
  }
};
// Exports
export default authReducer;
