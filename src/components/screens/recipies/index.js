import React, { useEffect, useRef, useState }  from "react";
import { useSelector } from "react-redux";
import "../../../utils/global.css"
import styles from './style.module.css';
import MyItem from '../../views/MyItem'
import { ROUTER_KEY } from "../../../asset/constants/constants";
import { Route } from "../../views";
import { useHistory } from "react-router-dom";
import nullAnimation from '../../../asset/lottie/searchNull.json'
import lottie from "lottie-web";
import ReactPaginate from "react-paginate";

const NUM_OF_RECIPIES = 12;
function Recipies() {
  const searchData = useSelector(state => state.searchReducer.searchData)
  const history = useHistory();
  const animtaionRef = useRef()
  useEffect(() => {
      lottie.loadAnimation({
      container: animtaionRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: nullAnimation,
    });
  }, []) 
  const [pageNumber, setpageNumber] = useState(1);
  const handlePageClick = (data) => {
    setpageNumber(data.selected+1);
  };
  return (
    <div>
      <Route route={ROUTER_KEY.RECIPIES}/>
      <div className={styles.contain}>
      {searchData.length > 0  ? (
        searchData.map((obj, index)=> {
          if(index >= (pageNumber-1)*NUM_OF_RECIPIES && index < pageNumber*NUM_OF_RECIPIES  ) {
            return (
              <div key={index} className={styles.containItem}>
                  <MyItem
                    image={obj.img_url} 
                    onClick={()=> history.push({
                      pathname: ROUTER_KEY.ONE_RECIPIE,
                      state: obj
                    })}
                    rating={obj.rate} 
                    title={obj.name} 
                    des={obj.des}/>
              </div>            
            );
          } else {
            return null;
          }
       
        })
      ):(
          <div style={{ width: 500, height: 500 }} ref={(e) => animtaionRef.current = e}/>
      )}    
      </div>
    {searchData.length > NUM_OF_RECIPIES && (
      <div style={{display: 'flex', justifyContent: 'center', marginTop: 10}}>
        <ReactPaginate
          previousLabel={'previous'}
          nextLabel={'next'}
          breakLabel={'...'}
          breakClassName={'break-me'}
          pageCount={Math.floor(searchData.length /NUM_OF_RECIPIES )}
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
export default Recipies;