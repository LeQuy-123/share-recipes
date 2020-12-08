import { REDUX } from '../store/types';

// Initial State
const initialState = {
  listFavorites: [],
};
// Reducers (Modifies The State And Returns A New State)
export default function favoriteReducer(state = initialState, action) {
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
    // case REDUX.REMOVE_FROM_FAVORITE: {
    //   delete objFavorites[idItemFavorite];
    //   return {
    //     ...state,
    //     listFavorites: { ...objFavorites },
    //   };
    // }

    // Default
    default: {
      return state;
    }
  }
}

