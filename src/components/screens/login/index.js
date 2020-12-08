import React, { useRef, useState }  from "react";
import "../../../utils/global.css"
import background from '../../../asset/image/login_background.jpg'
import styles from './login.module.css'
import { MyInput, MySpinner } from "../../views";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { userLogin } from "../../../redux/action/userAction";
import { ROUTER_KEY } from "../../../asset/constants/constants";
function Login() {
  const [error, setError] = useState();

  const passwordRef = useRef();
  const emailRef = useRef();

  const dispatch = useDispatch();
  const history = useHistory();
  const handelLogin = () => {
    if(emailRef.current.getText()) {
      if(passwordRef.current.getText()) {
        dispatch(
            userLogin(
              emailRef.current.getText(),
              passwordRef.current.getText(),
              history,
              MySpinner,
              handelError
             )
          );
      } else {
          console.log('Mật khẩu trong')
      }
    } else {
          console.log('Tên đăng nhập trống')
    }
  }
  const handelError = (e) => {
    if(e?.email) setError(e.email)
    else setError('email or password not correct')
  };

  return (
    <div  className={styles.background} style={{backgroundImage: `url(${background})` }}>
      <div className={styles.content}> 
        <h1 className="demo">Login</h1>
        <MyInput onSubmit={(e)=> {
          if( e.keyCode  === 13) {
            passwordRef.current.focus();
          }
        }}
        ref={emailRef} 
        title="Email" 
        type="text"
        customError="Email is missing" />
        <MyInput
        onSubmit={(e)=> {
          if( e.keyCode  === 13) {
            handelLogin();
          }
        }} 
        ref={passwordRef} 
        title="Password" 
        type="password" 
        customError="Password is missing" />
        <p className={styles.error}>{error}</p>
        <button className={styles.buttonLogin} onClick={()=> handelLogin()}>
          <h3 className={styles.buttonText}>Login</h3>
        </button>
        <h4> --------Or-------- </h4> 
        <button className={styles.button} onClick={()=> history.push(ROUTER_KEY.SIGNIN)}>
          <h3 className={styles.buttonText}>Join us for Free</h3>
        </button>
      </div>
      <MySpinner></MySpinner>
    </div>
  );
}
export default Login;