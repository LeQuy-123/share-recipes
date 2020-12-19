import Axios from 'axios';
import { ROUTER_KEY } from '../../asset/constants/constants';
import MyAlert from '../../components/views/Alert';
import API from '../../utils/api';
import HandelError from '../../utils/handelError';
import { REDUX } from '../store/types';
// import { store as Store } from '../store';
var md5 = require('md5');

export const userLogin = ( email, password,  history, spiner, onErrorCallBack) => {
  spiner.show();
  return  function(dispatch){ API.post('/normal/login', {
    email: email?.trim()?.toLocaleLowerCase(),
    password: md5(password?.trim()),
  }).then(({ data }) => {
    dispatch({type: REDUX.UPDATE_USER_DATA, payload: data.user })
    dispatch({ type: REDUX.LOGIN });
    dispatch(userGetFavorite(data?.user?._id))
    dispatch({type: REDUX.UPDATE_REFRESH_TOKEN, payload: data.refreshToken})
    dispatch({type: REDUX.UPDATE_ACCESS_TOKEN, payload: data.accessToken})
    spiner.hide();
    history.replace(ROUTER_KEY.HOME);
  }).catch((error)=>{
     if (error.response) {
      if(error.response.status === 422) onErrorCallBack(error?.response?.data?.error)
      else  onErrorCallBack(error?.response?.data?.message)
    } else if (error.request) {
    } else {
      console.log('Error when setting up resuqest', error.message);
    }
    spiner.hide();
  });
  }
};
export const userForgetPassword = ( email, onSuccess, onError) => {
  return  function(dispatch){ API.post('/normal/recover', {
    email: email?.trim()?.toLocaleLowerCase(),
  }).then(({ data }) => {
    console.log("🚀 ~ file: userAction.js ~ line 43 ~ returnfunction ~ data", data.message)
    onSuccess(data.message);
  }).catch((error)=>{
    if (error.response) {
      console.log('errpr', error.response?.data?.message)
      onError(error.response?.data?.message);
    } else if (error.request) {
    } else {
      console.log('Error when setting up resuqest', error.message);
    }
  });
  }
};
export const userRegister = (email, username, password, spiner,onErrorCallBack, history) => {
    spiner.show();
    return function(dispatch){
    API.post('/normal/register',
    JSON.stringify( {
      email: email?.trim()?.toLocaleLowerCase(),
      username: username?.trim(),
      password: md5(password?.trim()),
    })).then(({ data }) => {
      MyAlert.show('success', 'Registration successful', 'You have successfully registered');
      history.replace(ROUTER_KEY.LOGIN);
      spiner.hide();
    }).catch((error)=>{
    if (error.response) {
      console.log(error.response.data);
      if(error.response.status === 401) onErrorCallBack('This email is already connected to an account')
      else  onErrorCallBack(error?.response?.data?.message)
    } else if (error.request) {
      console.log(error.request);
    } else {
      console.log('Error when setting up resuqest', error.message);
    }
    spiner.hide();
    });
  }
};

export const userUpdateInfo = ( username, token ) => {
  return  function(dispatch){API.put('/auth/update', {
    username: username?.trim(),
    // profileImage: profileImage,
  },{headers: { Authorization: `Bearer ${token}` }}
  ).then(({ data }) => {
    dispatch({type: REDUX.UPDATE_USER_DATA, payload: data.User })
  }).catch((error)=>{
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
export const userLogout = (token, history) => {
    return function(dispatch){
    API.delete('/normal/logout',{
    headers: {
    },
    data: {
      token: token
    }
  }).then(({ data }) => {
      delete Axios.defaults.headers.common["Authorization"]; 
    }).catch((er)=>{
      console.log('error when register -> ' , er)
    });
  }
};



//favorite
export const userAddFavorite = (id, token) => {
  return  function(dispatch){ API.post('/auth/favorite/createFavorite', {
    recipeID: id
  },{headers: { Authorization: `Bearer ${token}` }}
  ).then(({ data }) => {
    console.log("🚀 ~ file: userAction.js ~ line 103 ~ ).then ~ data", data)
    if(data.Recipe) {
    // dispatch({type: REDUX.ADD_TO_FAVORITE, payload: data.Favorites })
    dispatch({type: REDUX.GET_FAVORITE_LIST, payload: data.Favorites })
    }
  }).catch((error)=>{
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

export const userRemoveFavorite = (id, token) => {
  return  function(dispatch){ API.get('/auth/favorite/removeFavorite?favoriteID=' + id,{headers: { Authorization: `Bearer ${token}` }}
  ).then(({ data }) => {
    dispatch({type: REDUX.REMOVE_FROM_FAVORITE, payload: id })
  }).catch((error)=>{
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
export const userGetFavorite = (id) => {
  return  function(dispatch){ API.get('/normal/favorite/getAllFavoritesOfUser?userID='+ id)
  .then(({ data }) => {
    dispatch({type: REDUX.GET_FAVORITE_LIST, payload: data.Favorites })
  }).catch((er)=>{
    HandelError(er, ()=> {})
  });
  }
};

//history 
export const userAddHistory = (id, token) => {
  return  function(dispatch){ API.post('/auth/history/createHistory', {
    recipeID: id
  },{headers: { Authorization: `Bearer ${token}` }}
  ).then(({ data }) => {
    if(data?.Histories) {
    dispatch({type: REDUX.ADD_TO_FAVORITE, payload: data?.Histories })
    }
  }).catch((error)=>{
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


export const userSendReview = (id, token, star, note, onSuccess) => {
  return  function(dispatch){ API.post('/auth/review/createReview', {
    stars: star,
    note: note,
    recipeID: id
  },{headers: { Authorization: `Bearer ${token}` }}
  ).then(({ data }) => {
    console.log("🚀 ~ file: userAction.js ~ line 174 ~ ).then ~ data", data)
    onSuccess(data.Recipe?.reviews)
  }).catch((error)=>{
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
export const userGetReview = (id, onSuccess) => {
  return  function(dispatch){API.get('/normal/review/getAllReviewsOfRecipe?recipeID=' + id)
  .then(({ data }) => {
    onSuccess(data.Reviews)
  }).catch((error)=>{
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