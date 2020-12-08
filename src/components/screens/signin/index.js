import React, {  useRef, useState }  from "react";
import "../../../utils/global.css"
import background from '../../../asset/image/login_background.jpg'
import  styles from './style.module.css'
import { MyInput, MySpinner } from "../../views";
import { useDispatch } from "react-redux";
import { userRegister } from "../../../redux/action/userAction";
import { useHistory } from "react-router-dom";
import MyAlert from "../../views/Alert";
const SignIn = () => {
  const userNameRef = useRef();
  const passwordRef = useRef();
  const emailRef = useRef();
  const confirmPasswordRef = useRef();
  const dispatch = useDispatch();
  const history = useHistory();

  const [error, setError] = useState();

  const handelRegister = () => {
    if(userNameRef.current.getText()) {
      if(emailRef.current.getText()) {
        if(passwordRef.current.getText().length >= 6) {
          if(passwordRef.current.getText() === confirmPasswordRef.current.getText()) {
            dispatch(
              userRegister(
                emailRef.current.getText(),
                userNameRef.current.getText(),
                passwordRef.current.getText(),
                MySpinner,
                handelError,
                history
              )
            );
          } else if(confirmPasswordRef.current.getText()){
            setError('Confirm password not match')
         }
        } else {
           setError('Password must be at least 6 characters')
        }
      }
    }
  }
   const handelError = (e) => {
    if(e?.email) setError(e.email)
    else setError(e)
  };
  return (
    <div  className={styles.background} style={{backgroundImage: `url(${background})` }}>
      <div className={styles.content}> 
        <h1 className={styles.title}>Sign In</h1>
        <MyInput 
        onSubmit={(e)=> {
          if( e.keyCode  === 13) {
            emailRef.current.focus();
          }
        }} ref={userNameRef} title="Username" type="text"  customError="Your name is missing"/>
        <MyInput
         onSubmit={(e)=> {
          if( e.keyCode  === 13) {
            passwordRef.current.focus();
          }
        }}  ref={emailRef} title="Email" type="text" customError="Email is missing"/>
        <MyInput
         onSubmit={(e)=> {
          if( e.keyCode  === 13) {
            confirmPasswordRef.current.focus();
          }
        }}  ref={passwordRef} title="Password" type="password" customError="Password is missing"/>
        <MyInput
         onSubmit={(e)=> {
          if( e.keyCode  === 13) {
            handelRegister();
          }
        }}  ref={confirmPasswordRef} title="Confirm Password" type="password" customError="Please confirm your password"/>
        <p className={styles.error}>{error}</p>
        <button className={styles.button} onClick={()=> handelRegister()}>
          <h3 className={styles.buttonText}>Register</h3>
        </button>
      </div>
        <MySpinner />
        <MyAlert />
    </div>
  );
}
export default SignIn;