import React from 'react';
import './App.css';
import { Redirect, Route, withRouter } from "react-router-dom";
import { ROUTER_KEY } from './asset/constants/constants';


function PrivateRoute ({component: Component, authed, ...rest}) {

  return (
    <Route
      {...rest}
      render={(props) => authed === true
        ? <Component {...props} />
        : <Redirect to={{pathname: ROUTER_KEY.LOGIN}} />}
    />
  )
}

export default withRouter(PrivateRoute);
