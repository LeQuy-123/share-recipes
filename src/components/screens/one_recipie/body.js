import React, { forwardRef, useEffect, useImperativeHandle, useState }  from "react";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
// import { ROUTER_KEY } from "../../../asset/constants/constants";
import { guestViewRecipie } from "../../../redux/action/guestAction";
import {  MyLoader  } from "../../views";
import styles from './style.module.css';
import { BsFillCaretLeftFill, BsFillCaretRightFill } from "react-icons/bs";
import Carousel, { consts } from 'react-elastic-carousel'

const BREACK_POINT = [
        { width: 500, itemsToShow: 1 },
        { width: 800, itemsToShow: 2, itemsToScroll: 2},
      ]
const RecipeBody = (props, ref) => {
  // const history = useHistory();
  const [type, settype] = useState(true);
  const recipiesData = props.data;
  const dispatch = useDispatch();
  const [isLoading, setisLoading] = useState(true);
  const [data, setdata] = useState();
  console.log("🚀 ~ file: body.js ~ line 22 ~ RecipeBody ~ data", data)
  const onDone = (recipies) => {setisLoading(false); setdata(recipies)}
  useEffect(() => {
    dispatch(guestViewRecipie(recipiesData.id, onDone));
  }, [])

  useImperativeHandle(ref, () => ({
    toImage: () => {
     settype(false)
    },
    toData: () => {
     settype(true)
    },
  }));
  const  myArrow = ({ type, onClick, isEdge }) =>{
  const pointer = type === consts.PREV ? 
        <BsFillCaretLeftFill size={40} color="#858585"/> :
        <BsFillCaretRightFill size={40} color="#858585"/>
      return (
        <button className={styles.myArrow} onClick={onClick} disabled={isEdge}>
          {pointer}
        </button>
      )
    }
  if(isLoading) return  <MyLoader height={900} />
  else if (type) {
     return (
    <div className={styles.view}>
        <h3 className={styles.recipiesTitle}>Ingredient: </h3>
        <ol>
            {data?.Ingredients.map((obj, index) => {
            return <li key={index}><p style={{fontSize: 14}}>{obj.content}</p></li>
            })}
        </ol>
        <h3 className={styles.recipiesTitle}>Step: </h3>
        <ol>
            {data?.Steps.map((obj, index) => {
              return <li key={index}><p style={{fontSize: 14}}>{obj.content}</p></li>
            })}
        </ol>
    </div>
  );
  } else {
    return (
    <div className={styles.view}>
     <Carousel renderArrow={myArrow} 
        className={styles.CarouselHome}
        breakPoints={BREACK_POINT} 
        disableArrowsOnEnd={true} 
        pagination={false}
        showArrows={true}>
        {data?.Pictures?.map((obj, index)=> {
          return (
            <img src={obj.img_url}
              alt="fst"
              className={styles.image}
              key={index}
              />            
            );
        })} 
      </Carousel> 
    </div>
    );
  }
 
}
export default forwardRef(RecipeBody);