import React, { useEffect, useRef, useState }  from "react";
import { useDispatch, useSelector } from "react-redux";
import "../../../utils/global.css"
import styles from './style.module.css';
import MyItem from '../../views/MyItem'
import { ROUTER_KEY } from "../../../asset/constants/constants";
import { Route } from "../../views";
import { useHistory } from "react-router-dom";
import nullAnimation from '../../../asset/lottie/searchNull.json'
import lottie from "lottie-web";
import ReactPaginate from "react-paginate";
import { getRecipesCategory } from "../../../redux/action/webAction";

const NUM_OF_RECIPIES = 12;
function Recipies(router) {
    const history = useHistory();
  const dispatch = useDispatch();
  const [categoryList, setCategoryList] = useState([])
  const key =  history.location.state;
  useEffect(() => {
    dispatch(getRecipesCategory( key, (res)=>{ setCategoryList(res)}));
    return () => setCategoryList([]);
  }, [])
  const searchData =useSelector(state => state.searchReducer.searchData)
  const data =  key ? categoryList : searchData;
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
  const route = key ? ROUTER_KEY.RECIPIES+ '/'+ key : ROUTER_KEY.RECIPIES
  return (
    <div>
      <Route route={route}/>
      <div className={styles.contain}>
      {data.length > 0  ? (
        data.map((obj, index)=> {
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
          <div style={{ width: 500, height: 525 }} ref={(e) => animtaionRef.current = e}/>
      )}    
      </div>
    {data.length > NUM_OF_RECIPIES && (
      <div style={{display: 'flex', justifyContent: 'center', marginTop: 10}}>
        <ReactPaginate
          previousLabel={'previous'}
          nextLabel={'next'}
          breakLabel={'...'}
          breakClassName={'break-me'}
          pageCount={Math.floor(data.length /NUM_OF_RECIPIES )}
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