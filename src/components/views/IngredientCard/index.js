
import React, { forwardRef, useImperativeHandle, useState } from "react";
import  styles from './style.module.css'
import defaultImage from '../../../asset/image/star.png'

const IngredientCard = (props, ref) => {
    const allData = props.data;
    console.log("🚀 ~ file: index.js ~ line 8 ~ IngredientCard ~ allData", allData)
    const [text, setText] = useState('');
    const [image, setimage] = useState();
    const handelChangeText = (t) => {
      setText(t);
      const data = allData.filter((obj, index)=>{
        console.log(obj.name)
        return obj.name.toLowerCase() === t.toLowerCase()
      });
      console.log("🚀 ~ file: index.js ~ line 15 ~ data ~ data", data)
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

