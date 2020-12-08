import lottie from "lottie-web";

import React, { useEffect, useRef  } from "react";
import styles from './style.module.css'
import animation1 from '../../../asset/lottie/11244-vegetables-and-cook.json'
import animation2 from '../../../asset/lottie/18067-delicious-burger.json'
import animation3 from '../../../asset/lottie/19702-frappe-coffee.json'
import animation4 from '../../../asset/lottie/9891-happy-donut.json'
import animation5 from '../../../asset/lottie/27444-chips-salsa.json'
import animation6 from '../../../asset/lottie/25523-wok-pan-food-fry-on-fire.json'
import animation7 from '../../../asset/lottie/28867-ice-cream.json'
import animation8 from '../../../asset/lottie/31454-food-prepared-food-app.json'
import { useWindowSize } from "../../hooks";
import Carousel from 'react-elastic-carousel'
import { useHistory } from "react-router-dom";
import { ROUTER_KEY } from "../../../asset/constants/constants";


const COLLECTION_BAR_ITEM= [
  {
    animation: animation1,
    title: "Fired Food"
  },
   {
    animation: animation2,
    title: "Bread"
  },
   {
    animation: animation3,
    title: "Soft Drink"
  },
   {
    animation: animation4,
    title: "Sweet"
  },
   {
    animation: animation5,
    title: "10 Minutes Treat"
  },
   {
    animation: animation6,
    title: "Side Dish"
  },
   {
    animation: animation7,
    title: "Dessert"
  },
   {
    animation: animation8,
    title: "Main Dish"
  },
]

const CollectionBar = () => {
    // const size = useWindowSize();
    const BREACK_POINT = [
        { width: 1, itemsToShow: 2 },
        { width: 550, itemsToShow: 3, itemsToScroll: 2},
        { width: 850, itemsToShow: 5 },
        { width: 1150, itemsToShow: 8, itemsToScroll: 2 },
      ]
    return (
      <Carousel breakPoints={BREACK_POINT} disableArrowsOnEnd={false} showArrows={true} pagination={false}>
          {COLLECTION_BAR_ITEM.map((obj, index)=> {
            return (
                <CollectionBarItem key={index} animation={obj.animation} title={obj.title}/> 
            );
          })} 
      </Carousel>     
   );
}
export default CollectionBar;

const CollectionBarItem  = (props) => {
    const size = useWindowSize();
    useEffect(() => {
    if(size.width > 860) {
     
    }
  }, [size.width])
    const itemRef = useRef([])
    useEffect(() => {
    itemRef.current[0] = lottie.loadAnimation({
      container: itemRef.current[1],
      renderer: 'svg',
      loop: false,
      autoplay: false,
      initialSegment: [5,80],
      animationData:  props.animation,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) 
  const history = useHistory();
  return (
    <button 
      onClick={()=>{console.log("CollectionBarItem -> props.title", props.title);history.push(ROUTER_KEY.COLLECTION)}}
      className={styles.CollectionBarItem} 
      onMouseEnter={() => itemRef.current[0].playSegments([[5, 80]], true)}>
      <div style={{ width: 130, height: 100 }} ref={(e) => itemRef.current[1] = e}/>
      <p className={styles.title}>{props.title}</p>
  </button>
  );
}
