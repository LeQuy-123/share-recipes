import { REDUX } from '../store/types';

// Initial State
const initialState = {
  listReview: [],
};
// Reducers (Modifies The State And Returns A New State)
export default function reviewReducer(state = initialState, action) {
  // const idItemFavorite = action?.payload?._id;
  // const objFavorites = state?.listFavorites;

  switch (action.type) {
    case REDUX.CLEAR_DATA: {
      return initialState;
    }
    case REDUX.GET_FAVORITE_LIST: {
      return {
        ...state,
        listFavorites: action.payload,
      };
    }
    case REDUX.ADD_TO_FAVORITE: {
      return {
        ...state,
        listFavorites: [...state.listFavorites, action.payload]
      };
    }
    case REDUX.REMOVE_FROM_FAVORITE: {
      return {
        ...state,
        listFavorites: state.listFavorites.filter((obj, index) => {return obj._id !== action.payload})
      };
    }

    // Default
    default: {
      return state;
    }
  }
}

