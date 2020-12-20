
import React, { forwardRef, useImperativeHandle, useState } from "react";
import  styles from './style.module.css'
import defaultImage from '../../../asset/image/star.png'

const IngredientCard = (props, ref) => {
    const allData = props.data;
    const [text, setText] = useState(props.title);
    const [image, setimage] = useState();
    const handelChangeText = (t) => {
      setText(t);
      const data = allData?.filter((obj, index)=>{
        return obj.name.toLowerCase() === t.toLowerCase()
      });
      if(data) {setimage(data[0]?.img_url); props.onSubmit(data[0]?._id)}
    }
    return (
      <div className={styles.IngredientCard} onClick={()=>{if(text === props.title)setText('')}}>       
        <img src={image ? image : defaultImage}
          alt="new"
          className={styles.image}
        />
        <input 
          onChange={(v)=> {handelChangeText(v.target.value)}}
          type="text" 
          className={styles.title}
          value={text}
        />
      </div>   
   );
}
export default forwardRef(IngredientCard);

