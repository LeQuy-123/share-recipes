import React, { useEffect, useState } from 'react';
import './App.css';
import { Route, Switch, withRouter } from "react-router-dom";
import  { Home, Collection, LeftOver, MyPage, MyRecipies, Planner, Login, SignIn, OneRecipie } from './components/screens';
import { Footer, Header } from './components/views';
import { HIDE_HEADER_LIST, ROUTER_KEY } from './asset/constants/constants';
import bg from './asset/image/bg.png';
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css"
import Recipies from './components/screens/recipies';
import { useDispatch, useSelector } from 'react-redux';
import PrivateRoute from './PrivateRoute ';
// import MyAlert from './components/views/Alert';
import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme } from './theme';
import { GlobalStyles } from './global';
import { REDUX } from './redux/store/types';
const  App = (router) => {
  const login = useSelector(state => state.authReducer.loggedIn);
  const [islogin, setisLogin] = useState(login);
  useEffect(() => {
    setisLogin(login);
  }, [login])
  const dispatch = useDispatch();
  const [themeIsDark, setThemeIsDark] = useState(false);

  //  The function that toggles between themes
  const toggleTheme = () => {
    setThemeIsDark(!themeIsDark)
    dispatch({type: REDUX.TOGGLE_DARK_MODE})
  }
  return (
    <ThemeProvider theme={themeIsDark ? darkTheme: lightTheme}>
    <>       
      <GlobalStyles />
      <div className="App" style={{backgroundImage: `url(${bg})`,  backgroundRepeat: 'repeat-y' }}>
      {!HIDE_HEADER_LIST.includes(router.location.pathname) ? 
            <Header showHeader={true} toggleDarkMode={() => toggleTheme()} isDarkMode={themeIsDark}/> : null }
      <Switch>
        <Route path={ROUTER_KEY.HOME} component={Home} exact />
        <Route path={ROUTER_KEY.RECIPIES} component={Recipies} exact />
        <Route path={ROUTER_KEY.ONE_RECIPIE} component={OneRecipie} exact />
        <Route path={ROUTER_KEY.LOGIN} component={Login} exact />
        <Route path={ROUTER_KEY.SIGNIN} component={SignIn} exact />
        <Route path={ROUTER_KEY.COLLECTION}  component={Collection} exact />
        <Route path={ROUTER_KEY.LEFTOVER}  component={LeftOver} exact />
         {/* privite route */}
        <PrivateRoute authed={islogin} path={ROUTER_KEY.MYRECIPIES} component={MyRecipies} />
        <PrivateRoute authed={islogin} path={ROUTER_KEY.PLANNER} component={Planner} />
        <PrivateRoute authed={islogin} path={ROUTER_KEY.MYPAGE} component={MyPage} />
        <Route component={Error} />
      </Switch>
      {!HIDE_HEADER_LIST.includes(router.location.pathname) ? 
       <Footer/> : null }
    </div>
    </>
    
  </ThemeProvider>
   
  );
}

export default withRouter(App);
