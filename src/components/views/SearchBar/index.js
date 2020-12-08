
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { guestSearch } from "../../../redux/action/guestAction";
import CookingSpiner from "../CookingSpiner";
import  styles from './style.module.css'


const SearchBar = (props, ref) => {
    const [text, setText] = useState();
    const dispatch = useDispatch();
    const history = useHistory();
    useImperativeHandle(ref, () => ({
   
     }));
    return (
      <div className={styles.divWithBackground}>
        <input 
        onChange={e => setText(e.target.value)}
        type="text" className={styles.input} onKeyPress={e => {
          if(e.key === 'Enter') {
            dispatch(guestSearch(text,history))
          }
        }} />
        <button className={styles.button} onClick={()=> {
            if(text) {
              dispatch(guestSearch(text,history,CookingSpiner))
            }
          }         
        }>Search</button>       
      </div>   
   );
}
export default forwardRef(SearchBar);

