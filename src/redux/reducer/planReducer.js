import { REDUX } from '../store/types';

// Initial State
const initialState = {
  listPlanner: [],
};
// Reducers (Modifies The State And Returns A New State)
export default function planReducer(state = initialState, action) {
  // const idItemFavorite = action?.payload?._id;
  // const objFavorites = state?.listPlanner;

  switch (action.type) {
    case REDUX.CLEAR_DATA: {
      return initialState;
    }
    case REDUX.GET_PLANNER: {
      return {
        ...state,
        listPlanner: action.payload,
      };
    }
    case REDUX.ADD_TO_PLANNER: {
      return {
        ...state,
        listPlanner: [...state.listPlanner, action.payload]
      };
    }
    case REDUX.REMOVE_PLANNER: {
      return {
        ...state,
        listPlanner: state.listPlanner.filter((obj, index) => {return obj._id !== action.payload})
      };
    }

    // Default
    default: {
      return state;
    }
  }
}

