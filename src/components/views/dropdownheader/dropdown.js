import React, { forwardRef, useEffect, useState } from 'react';
import styles from './dropdown.module.css';
import { Link, useHistory } from 'react-router-dom';
import { MENU_ITEM, ROUTER_KEY } from '../../../asset/constants/constants';
import { useDispatch, useSelector } from 'react-redux';
// import { REDUX } from '../../../redux/store/types';
import { userLogout } from '../../../redux/action/userAction';
import { REDUX } from '../../../redux/store/types';

export const Dropdown = forwardRef((props, ref) => {
  const login = useSelector(state => state.authReducer.loggedIn);
  const [islogin, setisLogin] = useState(login);
  useEffect(() => {
    setisLogin(login);
  }, [login])
  const history = useHistory();
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.authReducer.accessToken)
  const logout = () => {
      dispatch({type: REDUX.CLEAR_DATA})
      history.replace(ROUTER_KEY.HOME);
      dispatch(userLogout(accessToken, history))
  }
    return (
      <div>
        <ul
          className={styles.dropdown_menu}
        >
          {MENU_ITEM.map((item, index) => {
            if(index <= 1) {
              return (
              <li key={index}>
                <Link
                className={styles.dropdown_link}
                to={islogin ? item.navTo : ROUTER_KEY.LOGIN}
                onClick={() => {props.onClickItem()}}
                >
                  {item.name}
                </Link>
              </li>        
            );
            } else {
               return (
              <li key={index}>
                <Link
                className={styles.dropdown_link}
                to={item.navTo }
                onClick={() => {props.onClickItem()}}
                >
                  {item.name}
                </Link>
              </li>        
            );
            }
          })}
          {islogin ? 
          <div className={styles.dropdown_gr_btn}>
            <Link className={styles.link} to={ROUTER_KEY.MYPAGE}>My Page</Link>
            <button className={styles.link_black} onClick={()=>logout()}> Log out</button>
          </div>
          :
          <div className={styles.dropdown_gr_btn}>
            <Link className={styles.link} to={ROUTER_KEY.LOGIN}>Join free</Link>
            <Link className={styles.link_black} to={ROUTER_KEY.SIGNIN}>Sign in</Link>
          </div> } 
          
        </ul>     
      </div>
  );
})


