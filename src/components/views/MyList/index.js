
import React from "react";
import styles from './style.module.css'
import Carousel, { consts } from 'react-elastic-carousel'
import MyItem from '../MyItem'
import { BsFillCaretLeftFill, BsFillCaretRightFill } from "react-icons/bs";
import {CAROUSEL_TYPE, ROUTER_KEY} from '../../../asset/constants/constants'
import gold from '../../../asset/image/goldMedal.png'
import { useHistory } from "react-router-dom";
const MyList = (props, ref) => {
    // const size = useWindowSize();
    const listData = props.data;
    const history = useHistory();
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
    const BREACK_POINT = [
        { width: 1, itemsToShow: 1 },
        { width: 550, itemsToShow: 2, itemsToScroll: 2},
        { width: 850, itemsToShow: 3 },
        { width: 1150, itemsToShow: 5, itemsToScroll: 2 },
      ]
    if(props.customType === CAROUSEL_TYPE.HOME ) {
      return (
        <div className={styles.row}>
          <div className={styles.myAva}>
            <div  className={styles.imageContain} style={{backgroundImage: `url(${listData[0]?.img_url})`, backgroundSize: 'cover'}}>
              <div className={styles.image}>
              <img src={gold}
              alt="fst"
              className={styles.medal}
              />
            </div>  
          </div> 
            <h2 className={styles.titleAva}>{props.listTitle}</h2>  
            <p  className={styles.text}>{props.listDescription}</p>  
          </div>
          <Carousel renderArrow={myArrow} 
            className={styles.CarouselHome}
            breakPoints={BREACK_POINT} 
            disableArrowsOnEnd={false} 
            pagination={false}
            showArrows={false}>
            {listData?.map((obj, index)=> {
            return (
              <div key={index} className={styles.containItem2}>
                  <MyItem
                    image={obj.img_url}
                    onClick={()=> history.push({
                      pathname: ROUTER_KEY.ONE_RECIPIE,
                      state: obj
                    })}
                    rating={obj.rate} title= {obj.name}
                    des={obj.des}/>
              </div>             
              );
            })} 
          </Carousel>     
        </div>
      ) 
    } else {
      return (
      <div className={styles.margin}>
        <div className={styles.header}>
          <h2 className={styles.title}>{props.listTitle}</h2>
          <button className={styles.seeMore} onClick={props.seeMorePress}>See more ...</button>
        </div> 
        {
          listData.length > 0 ? (
           <Carousel renderArrow={myArrow} 
            className={!props.shadow ? styles.carousel : styles.carouselShadow}
            breakPoints={BREACK_POINT} 
            disableArrowsOnEnd={false} 
            pagination={false}
            showArrows={true}>
            {listData?.map((obj, index)=> {
              const data = obj.rate ? obj: obj.recipeID
              return (
              <div key={index} className={styles.containItem}>
                 <MyItem
                    image={data?.img_url}
                    onClick={()=> history.push({
                      pathname: ROUTER_KEY.ONE_RECIPIE,
                      state: data
                    })}
                    rating={data?.rate} title= {data?.name}
                    des={data?.des}/>
              </div>             
              );
            })} 
          </Carousel>     
          ):(
            <div className={styles.emptylist}>
            </div>  
          )
        }  
       
      </div>
      )
    }   
}
export default MyList;


