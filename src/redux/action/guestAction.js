import Axios from 'axios';
import { ROUTER_KEY } from '../../asset/constants/constants';
import { CookingSpiner } from '../../components/views';
import API from '../../utils/api';
import { REDUX } from '../store/types';

export const guestSearch = (key, history) => {
    CookingSpiner.show();
    return function(dispatch){
    API.get('/normal/recipe/searchRecipe?keySearch='+key)
    .then(({ data }) => {
      dispatch({type: REDUX.UPDATE_SEARCH_RESULT, payload: data});
      CookingSpiner.hide();
      history.push(ROUTER_KEY.RECIPIES);
    }).catch((er)=>{
      CookingSpiner.hide();
      console.log('error when search -> ' , er.response)
    });
  }
};
export const guestViewRecipie = (id, onDone) => {
    return function(dispatch){
    API.get('/normal/recipe/getRecipe?recipeID='+id)
    .then(({ data }) => {
      onDone(data);
      // dispatch({type: REDUX.UPDATE_SEARCH_RESULT, payload: data});
    }).catch((error)=>{
      onDone();
       if (error.response) {
      console.log(error.response.data);
      } else if (error.request) {
      console.log(error.request);
      } else {
      console.log('Error when setting up resuqest', error.message);
      }
    });
  }
};
export const guestSearchIngredient = (key) => {
    return function(dispatch){
    API.get('/normal/recipe/searchRecipe?keySearch='+key)
    .then(({ data }) => {
      dispatch({type: REDUX.UPDATE_SEARCH_RESULT, payload: data});
      CookingSpiner.hide();
    }).catch((er)=>{
      CookingSpiner.hide();
      console.log('error when search -> ' , er.response)
    });
  }
};