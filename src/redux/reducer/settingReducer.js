import { REDUX } from '../store/types';

// Initial State
const initialState = {
  isDarkMode: false,
};
// Reducers (Modifies The State And Returns A New State)
const settingReducer = (state = initialState, action) => {
  switch (action.type) {
    case REDUX.CLEAR_DATA: {
      return initialState;
    }
    case REDUX.TOGGLE_DARK_MODE: {
      return {
        ...state,
        isDarkMode: !state.isDarkMode,
      };
    }
    default: {
      return state;
    }
  }
};
// Exports
export default settingReducer;
