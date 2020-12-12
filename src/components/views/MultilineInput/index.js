
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import  styles from './style.module.css'

const MultilineInput = (props, ref) => {
    const [text, setText] = useState('');
    const thisRef = useRef();
    useImperativeHandle(ref, () => ({
    getText: () => {
      // if(!text) setisError(true); 
      // else setisError (false);
      return text.trim();
    },
    focus: () => {
      thisRef.current.focus();
    }
     }));
    // const [isError, setisError] = useState(false);
    return (
      <div className={styles.MultilineInput}>  
          <textarea className={styles.input} rows="5"  ref={thisRef} onChange={(v)=> {setText(v.target.value)}}/>
      </div>   
   );
}
export default forwardRef(MultilineInput);

