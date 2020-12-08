import { REDUX } from '../store/types';

// Initial State
const initialState = {
  searchData: [],
  topData: [],
  mainIngredient: [],
};
// Reducers (Modifies The State And Returns A New State)
const searchReducer = (state = initialState, action) => {
  switch (action.type) {
    // case REDUX.CLEAR_DATA: {
    //   return initialState;
    // }
    case REDUX.UPDATE_SEARCH_RESULT: {
      return {
        ...state,
        searchData: action.payload,
      };
    }
    case REDUX.GET_TOP_RATING: {
      return {
        ...state,
        topData: action.payload,
      };
    }
    case REDUX.GET_ALL_MAININGREDIENT: {
      return {
        ...state,
        mainIngredient: action.payload,
      };
    }
    default: {
      return state;
    }
  }
};
// Exports
export default searchReducer;
