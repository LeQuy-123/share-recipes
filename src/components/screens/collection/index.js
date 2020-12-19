import React, { useEffect, useState } from "react";
import styles from './style.module.css'
import { ROUTER_KEY, ITEM, CAROUSEL_TYPE } from "../../../asset/constants/constants";
import { MyList, Route } from "../../views";
import { useDispatch } from "react-redux";
import { getRecipesCategory } from "../../../redux/action/webAction";
import { useHistory } from "react-router-dom";

function Collection() {
  const history = useHistory();
  const dispatch = useDispatch();
  const [categoryList, setCategoryList] = useState([])
  const [categoryList2, setCategoryList2] = useState([])

  useEffect(() => {
    dispatch(getRecipesCategory('Dinner', (res)=>{ setCategoryList(res)}));
     dispatch(getRecipesCategory('Dessert', (res)=>{ setCategoryList2(res)}));
  }, [])
  return (
    <div>
      <Route route={ROUTER_KEY.COLLECTION}/>
      <MyList shadow={false} customType={CAROUSEL_TYPE.NORMAL} data={categoryList} listTitle="Dinner" listDescription="Tasty recipes catching our eye" 
        seeMorePress = { ()=> history.push(ROUTER_KEY.RECIPIES,'Dinner')}
      />
      <MyList shadow={false} customType={CAROUSEL_TYPE.NORMAL} data={categoryList2} listTitle="Dessert" listDescription="Trending recipes from our site"
        seeMorePress = { ()=> history.push(ROUTER_KEY.RECIPIES,'Dessert')}
      />  
    </div>
  );
}
export default Collection;