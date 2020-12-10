import React, { useEffect, useRef, useState } from "react";
import "../../../utils/global.css"
import styles from './style.module.css'
import logo from '../../../asset/image/star.png';
import { AiFillHeart, AiOutlineHeart, AiFillStar } from "react-icons/ai";
import { BsStarHalf } from "react-icons/bs";
import { useDispatch, useSelector } from "react-redux";
import { userAddFavorite, userRemoveFavorite } from "../../../redux/action/userAction";

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
const RecipiesHeader = (props, ref) => {
  const favoriteList = useSelector(state => state.favoriteReducer.listFavorites);
  const obj = favoriteList.filter((obj, index) => {
    return obj?.recipeID?.id  === props.id || obj?._id ===  props.id;
  });
  const [isLike, setLike] = useState(obj.length > 0 ? true : false);

  const login = useSelector(state => state.authReducer.loggedIn);
  const token = useSelector(state => state.authReducer.accessToken)
  const [islogin, setisLogin] = useState(login);
  useEffect(() => {
    setisLogin(login);
  }, [login])
  const dispatch = useDispatch();
  const handelLikeBtnClick = () => {
    // if(isLike) {
    //   setLike(false)
    //   console.log("🚀 ~ file: index.js ~ line 68 ~ handelLikeBtnClick ~ obj[0]?._id", obj[0])
    //   console.log("🚀 ~ file: index.js ~ line 72 ~ handelLikeBtnClick ~ obj[0]?.favid", obj[0]?.favid)
    //   // if(obj[0]?.favid)dispatch(userRemoveFavorite(obj[0]?.favid, token))
    //   // else if(obj[0]?._id) dispatch(userRemoveFavorite(obj[0]?._id, token))
    // } else {
    //   setLike(true)
    //   dispatch(userAddFavorite(props.id, token))
    // }  
  }
   return (
    <div className={styles.row}>
      <img src={props.image}
          width="200" height="200"
          alt="new"
          className={styles.image}
      />
      <div className={styles.data}>
        <div>
          <h3 className={styles.noMargin}>{props.name}</h3>
          <p  className={styles.noMargin}>{props.des}</p>
        </div>
          <div className={styles.fullrow}>
            <div className={styles.rowOnly}>
              <h4 className={styles.noMargin}> Rating: </h4> 
              {props.rating === 0 && <BsStarHalf  size={30}  color="yellow"/>}
              {STAR.map((obj, index) => {
                if(index < Math.floor(props.rating)) {
                  return <AiFillStar key={index} size={30}  color="yellow"/>
                } else {
                  if(props.rating !== Math.floor(props.rating)) return <BsStarHalf  size={30}  color="yellow"/>
                  return null;
                }               
              })}     
            </div>
            {islogin  && 
              <div className={styles.rowOnly} onClick={()=> handelLikeBtnClick()}>
                {isLike ? <AiFillHeart size={40} color="red"/>: <AiOutlineHeart size={40}  color="red"/>}
              </div>
            }
          </div>
        </div>
    </div>
  );
}
export default RecipiesHeader;