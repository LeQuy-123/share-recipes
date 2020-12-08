/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { ROUTER_KEY,MENU_ITEM, APP_NAME } from "../../../asset/constants/constants";
import logo from '../../../asset/icon/logo.png'
import styles from "./style.module.css";
import {useWindowSize} from '../../hooks';
import menu from '../../../asset/lottie/5145-menu-open-and-close.json'
import lottie from 'lottie-web';
import { Dropdown } from "../dropdownheader/dropdown";
import { CSSTransition } from "react-transition-group";
import { useDispatch, useSelector } from "react-redux";
import { userLogout } from "../../../redux/action/userAction";
import { REDUX } from "../../../redux/store/types";
// import { REDUX } from "../../../redux/store/types";
// import { useDispatch } from "react-redux";
// import { userRegister } from "../../../redux/action/userAction";

const  Header = (props, ref) => {
  const dropwdownRef = useRef(null)
  const container = useRef(null)
  const menuIcon = useRef(null)
  const size = useWindowSize();
  const login = useSelector(state => state.authReducer.loggedIn);
  const [islogin, setisLogin] = useState(login);
  useEffect(() => {
    setisLogin(login);
  }, [login])
  useEffect(() => {
    if(size.width > 860) {
      if(showMessage) {
        menuIcon.current.playSegments([[130, 150]], true);
        setShowMessage(false);
      } 
    }
  }, [size.width])
  const history = useHistory();
  const dispatch = useDispatch();
  
  const accessToken = useSelector(state => state.authReducer.accessToken)

  const logout = () => {
      dispatch({type: REDUX.CLEAR_DATA})
      history.replace(ROUTER_KEY.HOME);
      dispatch(userLogout(accessToken, history))
  }
  //animation
  useEffect(() => {
    menuIcon.current = lottie.loadAnimation({
      container: container.current,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: menu,
    });
  }, []) 
    const [showMessage, setShowMessage] = useState(false);
   
    return (
    <>
      <nav className={styles.navbar}>
        <Link to={ROUTER_KEY.HOME} className={styles.navbar_logo}>
          <img  className={styles.Logo} src={logo} alt="Logo" />
          <p  className={styles.app_name}>
            {APP_NAME}
          </p>  
        </Link>
        <ul className={styles.nav_menu}>
          {MENU_ITEM.map((obj, index) => {
            if(index <= 1) {
              return <HeaderItem navTo={ islogin ? obj.navTo : ROUTER_KEY.LOGIN} name={obj.name} tip={obj.tip} key={index}></HeaderItem>;
            } else {
              return <HeaderItem navTo={obj.navTo} name={obj.name} tip={obj.tip} key={index}></HeaderItem>;
            }
          })}
        </ul>
        {islogin ? 
          <div className={styles.header_right}>
            <Link className={styles.link} to={ROUTER_KEY.MYPAGE}>My Page</Link>
            <button className={styles.link_black} onClick={()=>logout()}> Log out</button>
          </div>
          :
          <div className={styles.header_right}>
            <Link className={styles.link} to={ROUTER_KEY.SIGNIN}>Register</Link>
            <Link className={styles.link_black} to={ROUTER_KEY.LOGIN}>Login</Link>
          </div>} 
        <button  className={styles.menu_icon} onClick={()=> {
            if(showMessage) {
              menuIcon.current.playSegments([[80, 150]], true);
              setShowMessage(false);
            } else {
              menuIcon.current.playSegments([[0, 60]], true);  
               setShowMessage(true);
            }
         }}>
          <div style={{width: 58, height: 58}} ref={container}></div>
        </button>
      </nav>
       <CSSTransition
        in={showMessage}
        timeout={300}
        classNames={{
          enterActive: styles.menu_enter,
          enterDone: styles.menu_enter_active,
          exitActive: styles.menu_exit,
          exitDone: styles.menu_exit_active
        }}
        unmountOnExit
        style={{zIndex: 999}}
      >
       <Dropdown ref={dropwdownRef} onClickItem={()=> { 
          menuIcon.current.playSegments([[80, 150]], true);
          setShowMessage(false);}}
        />
      </CSSTransition>
    </>
   );
}
export default Header;



const HeaderItem = (props) => {
  return (
      <li className={styles.nav_item}>
            <Link to={props.navTo} className={styles.nav_links}>
              {props.name}
            </Link>
      </li>  
  )      
  };