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

  const infoRow = (title, info) => {
      return (
        <div style={{display: 'flex', width: '100%', paddingLeft: 20}}>
          <h4 style={{width: 100, margin: 0}}>{title}</h4>
           <p style={{marginLeft: 20, marginRight: 0, marginTop: 0, width: '60%'}}>{info}</p>
        </div>
      );
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
        <h3 className={styles.recipiesTitle}>Prepare info: </h3>
        {infoRow('Cooking time',data?.PrepTime[0]?.cook)}
        {infoRow('Prepare time',data?.PrepTime[0]?.prep)}
        {infoRow('Total time',data?.PrepTime[0]?.total)}
        {infoRow('Nutri fact',data?.PrepTime[0]?.nutrition_facts)}
        {infoRow('Serving',data?.PrepTime[0]?.yield)}
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