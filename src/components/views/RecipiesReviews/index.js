import React, { useEffect, useRef, useState } from "react";
import "../../../utils/global.css"
import styles from './style.module.css'
import default_avatar from '../../../asset/icon/default_avatar.png'
import ReactPaginate from 'react-paginate';
import lottie from "lottie-web";
import emptybox from '../../../asset/lottie/629-empty-box.json'
import { RiAddCircleLine } from "react-icons/ri";
import MyModal from "../MyModal";
import { useDispatch } from "react-redux";
import { userGetReview } from "../../../redux/action/userAction";
import logo from '../../../asset/image/star.png';
import ReadMore from "../ReadMore";
const RecipiesReviews = (props, ref) => {
  const idRecipies = props.data?.id;
  const dispatch = useDispatch();
  const [reviews, setreviews] = useState();
  useEffect(() => {
    dispatch(userGetReview(idRecipies, (reviews)=>setreviews(reviews)));
  }, [idRecipies, dispatch])
  const numOfPage = Math.floor(reviews?.length / 5) + 1;
  const [pageNumber, setpageNumber] = useState(1);
  const handlePageClick = (data) => {
    setpageNumber(data.selected+1);
  };

  const animtaionRef = useRef()
  useEffect(() => {
    if(animtaionRef.current) {
       lottie.loadAnimation({
      container: animtaionRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: emptybox,
    });
    }   
  }, []) 
  const addReviews = () => {
    modalRef.current.openModal();
  }
  const modalRef = useRef();
  return (
    <div className={styles.contain}>
      <h2 className={styles.title}>Reviews</h2>
       <hr
        style={{
            color: '#00000080',
            backgroundColor: '#00000080',
            height: 3,
            borderRadius: 5,
            width: '90%'
        }}
        />
      {reviews ? (
        <div style={{width: '100%'}}> 
          {reviews?.map((obj, index) => {
            if(index < pageNumber * 5 && index >= (pageNumber - 1)*5)
              return (
                <div key={index} style={{marginTop: 20 } }>
                  <ReviewItem data={obj}/>
                </div>
              ); 
            return null;
          })}
          {reviews.length > 5 && (
            <div style={{display: 'flex', justifyContent: 'center', marginTop: 10}}>
              <ReactPaginate
              previousLabel={'previous'}
              nextLabel={'next'}
              brAnheakLabel={'...'}
              breakClassName={'break-me'}
              pageCount={numOfPage}
              marginPagesDisplayed={2}
              pageRangeDisplayed={5}
              onPageChange={handlePageClick}
              containerClassName={"pagination"}
              previousLinkClassName={"pagination__link"}
              nextLinkClassName={"pagination__link"}
              disabledClassName={"pagination__link--disabled"}
              activeClassName={"pagination__link--active"}/>   
            </div>
          )}
        </div>     
      ):(
        <div className={styles.emptyReview}>
          <div style={{ width: 250, height: 200}} ref={(e) => animtaionRef.current = e}/>
          <h2 style={{margin: 0, padding: 0, textAlign: 'center'}}>This recipe doesn't have any reviews, let be the first one  </h2>
        </div>  
      )}
      <button className={styles.btn} onClick={()=> addReviews()}>
       <RiAddCircleLine size={40} />
        Add reviews
      </button>
      <MyModal ref={modalRef} id={idRecipies} onAddReview={(review)=> setreviews(review)}/>
    </div>
  );
 
}
export default RecipiesReviews;

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

const ReviewItem = (props, ref) => {
  const data = props.data;
  const user = props.data?.userID;
   return (
    <div className={styles.row}>
      <img className={styles.ava}  src={user?.profileImage ? user?.profileImage : default_avatar}  alt="avatar"/>
      <div>
        <h4 className={styles.userName}>{user?.username ? user?.username : 'Guest'}</h4>
        <ReadMore note={data.note} style={styles.content}/>
        {/* <p className={styles.content}>{data.note}</p> */}
        <div style={{display: 'flex', position: 'absolute', bottom: 10, left: 5}}>
        Rate:
         {STAR.map((obj, index) => {
            if(index < Math.floor(data.stars)) {
              return <img key={index} className={styles.rate} src={obj.image} alt="star"/>
            } else {
              return null;
            }
          })}
        </div> 
        <p style={{margin: 0, padding: 0, position: 'absolute', bottom: 10, right:5}}> {data.createdAt.replace(/T/, ' ').replace(/\..+/, '')} </p> 
      </div>
    </div>
  );
}