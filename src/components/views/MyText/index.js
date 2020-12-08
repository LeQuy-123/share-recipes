
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import  styles from './style.module.css'

const MyInput = (props, ref) => {
    const [text, setText] = useState('');
    const inputRef = useRef();
    useImperativeHandle(ref, () => ({
    getText: () => {
      if(!text) setisError(true); 
      else setisError (false);
      return text.trim();
    }
     }));
    const [isError, setisError] = useState(false);
    return (
      <div className={styles.myInput}>       
          <h2 className={styles.title}>{props.title}</h2>
          <div className={styles.row}>
            <input 
            readOnly={!props.showEdit}
            defaultValue={props.children}
            ref={inputRef}
            className={styles.inputText}
            type={props.type}
            onKeyDown={e => {props.submit(e)}}
            onChange={(v)=> {setText(v.target.value)}}/>
            {props.showEdit &&
              <button className={styles.clickAbleText} onClick={()=>inputRef.current.focus()}>
                <h2 className={styles.noPading}>Edit</h2>
              </button>
            }
          </div>

      </div>   
   );
}
export default forwardRef(MyInput);

