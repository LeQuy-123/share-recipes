
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import  styles from './style.module.css'

const ReadMore = (props, ref) => {
    const length = props.length ? props.length : 100;
    const maxString = props.note;
    const minString = maxString.substr(0, length) + '...';
    const [isMore, setIsMore] = useState(maxString.length < length);
    const handelShowMore = ()=>{
      setIsMore(!isMore);
    }
    const thisRef = useRef();
    useImperativeHandle(ref, () => ({
   
     }));
    return (
      <div className={props.style}>       
          <p>{isMore ? maxString : minString}
            {props.note?.length > length &&  
            <button onClick={()=> handelShowMore()} className={styles.showBtn}>{isMore ? 'Show less' : 'Show more'}</button>  }  
          </p> 
      </div>   
   );
}
export default forwardRef(ReadMore);

