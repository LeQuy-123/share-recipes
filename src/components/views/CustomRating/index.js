
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import  styles from './style.module.css'
import star from '../../../asset/image/star.png';
import graystar from '../../../asset/image/graystar.png';

const STAR = [
  {
    image: star,
  },
  {
    image: star,
  },
  {
    image: star,
  },
  {
    image: star,
  },
  {
    image: star,
  }
]

const CustomRating = (props, ref) => {
    const [rating, setRating] = useState(5);
    useImperativeHandle(ref, () => ({
    getRate: () => {
      // if(!text) setisError(true); 
      // else setisError (false);
      return rating;
    },
     }));
    return (
      <div className={styles.row}>
      Rate: 
         {STAR.map((obj, index) => {
            if(index < Math.floor(rating)) {
              return <img key={index} className={styles.rate} src={star} alt="star" onClick={()=>{setRating(index + 1)}}/>
            } else {
              return <img key={index} className={styles.rate} src={graystar} alt="star" onClick={()=>{setRating(index + 1)}}/>;
            }
          })}
      </div>   
   );
}
export default forwardRef(CustomRating);

