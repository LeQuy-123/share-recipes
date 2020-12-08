
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import  styles from './style.module.css'

const MyInput = (props, ref) => {
    const [text, setText] = useState('');
    const thisRef = useRef();
    useImperativeHandle(ref, () => ({
    getText: () => {
      if(!text) setisError(true); 
      else setisError (false);
      return text.trim();
    },
    focus: () => {
      thisRef.current.focus();
    }
     }));
    const [isError, setisError] = useState(false);
    return (
      <div className={styles.myInput}>       
          <h3 className={styles.title}>{props.title}</h3>
          <input 
            ref={thisRef}
            onKeyDown={(e) => props.onSubmit ? props.onSubmit(e) : null}
            className={styles.inputText}
            type={props.type}
            onChange={(v)=> {setText(v.target.value)}}/>
          {isError ? <p className={styles.myErr}>{props.customError}</p>: <div className={styles.myErrview}></div>}
      </div>   
   );
}
export default forwardRef(MyInput);

