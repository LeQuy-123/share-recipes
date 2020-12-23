
import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { guestSearch } from "../../../redux/action/guestAction";
import CookingSpiner from "../CookingSpiner";
import  styles from './style.module.css'


const SearchBar = (props, ref) => {
    const [text, setText] = useState();
    const dispatch = useDispatch();
    const history = useHistory();
    const isDarkMode = useSelector(state => state.settingReducer.isDarkMode)
    const [isDark, setIsDark] = useState(isDarkMode)
    useEffect(() => {
      setIsDark(isDarkMode)
    }, [isDarkMode])


    useImperativeHandle(ref, () => ({
   
     }));
    return (
      <div className={!isDark ? styles.divWithBackground2 : styles.divWithBackground}>
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

