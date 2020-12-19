
import React, { forwardRef, useImperativeHandle, useState } from "react";
import  styles from './style.module.css'
import defaultImage from '../../../asset/image/star.png'

const IngredientCard = (props, ref) => {
    const allData = props.data;
    const [text, setText] = useState('');
    const [image, setimage] = useState();
    const handelChangeText = (t) => {
      setText(t);
      const data = allData?.filter((obj, index)=>{
        return obj.name.toLowerCase() === t.toLowerCase()
      });
      if(data) {setimage(data[0]?.img_url)}
    }
    return (
      <div className={styles.IngredientCard} onClick={()=>props.onClick()}>       
        <img src={image ? image : defaultImage}
          alt="new"
          className={styles.image}
        />
        <input 
          onChange={(v)=> {handelChangeText(v.target.value)}}
          type="text" className={styles.title}
          defaultValue={props.title}
          />
      </div>   
   );
}
export default forwardRef(IngredientCard);

