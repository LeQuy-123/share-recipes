import Axios from 'axios';
import API from '../../utils/api';
import { REDUX } from '../store/types';

export const getTopRecipies =(onSuccess) => {
    return function(dispatch){
    API.get('/normal/recipe/getAllRecipesForOthers?page=1')
    .then(({ data }) => {
      onSuccess(data?.Recipes);
      dispatch({type: REDUX.GET_TOP_RATING, payload: data?.Recipes});
    }).catch((er)=>{
      console.log('error when search -> ' , er.response)
    });
  }
};
export const getAllMainIngredient =() => {
    return function(dispatch){
    API.get('/normal/ingredient/getAllMainIngredient')
    .then(({ data }) => {
    console.log("🚀 ~ file: webAction.js ~ line 20 ~ .then ~ data", data?.MainIngredient)
    dispatch({type: REDUX.GET_ALL_MAININGREDIENT, payload: data?.MainIngredient})
    }).catch((er)=>{
      console.log('error when search -> ' , er.response)
    });
  }
};
