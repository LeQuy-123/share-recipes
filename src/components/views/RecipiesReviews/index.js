import React, { useState } from "react";
import "../../../utils/global.css"
import styles from './style.module.css'
import default_avatar from '../../../asset/icon/default_avatar.png'
import ReactPaginate from 'react-paginate';

const DATA = [
  {
    img: null,
    userName: 'a',
    index: 0,
    content: 'A really good Southern Egg Salad. Egg salad has a myriad of additions, but most come down to a good tangy taste with the incredible edible egg',
    rate: 5,
  },
   {
    img: null,
    userName: 'ascaa',
    content: `The taste was different, but, that is why I tried the recipe. I definitely won't grate it again`,
    rate: 5,
    index:1,
  },
   {
    img: null,
    userName: 'aflegft gloz',
    content: `This is the Best. I'm not a big fan of Hot sauce so I skipped that part.`,
    rate: 4,
    index: 2,
  },
   {
    img: null,
    content: 'Fantastic! We use rye bread and a little lettuce, cut into quarters and piled high on a platter for snack or appetizer',
    rate: 5,
    index: 3,
  },
   {
    img: null,
    userName: 'aflegft gloz',
    content: 'This sounds delicious! Can’t wait to try it!',
    rate: 5,
    index: 4,
  },
   {
    img: null,
    userName: 'aflegft gloz',
    content: 'This sounds delicious! Can’t wait to try it!',
    rate: 5,
    index: 5,
  },
   {
    img: null,
    content: 'This sounds delicious! Can’t wait to try it!',
    rate: 5,
    index: 6,
  },
]

const RecipiesReviews = (props, ref) => {
  const numOfPage = Math.floor(DATA.length / 5);
  const [pageNumber, setpageNumber] = useState(1);
  const handlePageClick = (data) => {
    setpageNumber(data.selected+1);
  };
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
    {DATA.map((obj, index) => {
      if(index < pageNumber * 5 && index >= (pageNumber - 1)*5)
      return (
        <div key={index} style={{marginTop: 20}}>
          <ReviewItem data={obj}/>
        </div>
      ); 
      return null;
    })}
    {DATA.length > 5 && (
      <div style={{display: 'flex', justifyContent: 'center', marginTop: 10}}>
        <ReactPaginate
          previousLabel={'previous'}
          nextLabel={'next'}
          breakLabel={'...'}
          breakClassName={'break-me'}
          pageCount={numOfPage+1}
          marginPagesDisplayed={2}
          pageRangeDisplayed={5}
          onPageChange={handlePageClick}
          containerClassName={"pagination"}
          previousLinkClassName={"pagination__link"}
          nextLinkClassName={"pagination__link"}
          disabledClassName={"pagination__link--disabled"}
          activeClassName={"pagination__link--active"}
        />   
      </div>
    )}
   
    </div>
  );
}
export default RecipiesReviews;

const ReviewItem = (props, ref) => {
  const data = props.data;
   return (
    <div className={styles.row}>
      <img className={styles.ava}  src={data.img ? data.img : default_avatar}  alt="avatar"/>
      <div>
      <h4 className={styles.userName}>{data.userName ? data.userName : 'Guest'}</h4>
        <p className={styles.content}>{data.content}</p>
      </div>
    </div>
  );
}