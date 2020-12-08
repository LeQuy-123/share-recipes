
import React, { forwardRef, useImperativeHandle, useState } from "react";
import  styles from './style.module.css'
import logo from '../../../asset/image/star.png';

const STAR = [
  {
    image: logo,
  },
  {
    image: logo,
  },
  {
    image: logo,
  },
  {
    image: logo,
  },
  {
    image: logo,
  }
]

const MyItem = (props, ref) => {
    return (
      <div className={styles.myItem} onClick={()=>props.onClick()}>       
        <img src={props.image}
          alt="new"
          className={styles.image}
        />
        <h3 className={styles.title}>{props.title}</h3>
        <div className={styles.des}>{props.des}</div>
        <div className={styles.row}>
         {STAR.map((obj, index) => {
            if(index < Math.floor(props.rating)) {
              return <img key={index} className={styles.rate} src={obj.image} alt="star"/>
            } else {
              return null;
            }
          })}
        </div>    
      </div>   
   );
}
export default forwardRef(MyItem);

