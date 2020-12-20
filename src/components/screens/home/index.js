/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { idText } from "typescript";
import { CAROUSEL_TYPE } from "../../../asset/constants/constants";
import { getAllMainIngredient,getTopRecipies } from "../../../redux/action/webAction";
import "../../../utils/global.css"
import { CollectionBar,CookingSpiner,MyList,SearchBar } from "../../views";
import MyAlert from "../../views/Alert";
import styles from './style.module.css'

function Home() {
  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const topData = useSelector(state => state.searchReducer.topData)
  useEffect(() => {
    if(topData?.length > 0) {setData(topData)}
    else{dispatch(getTopRecipies(getData))} 
    dispatch(getAllMainIngredient());
  }, [])
  const getData = (data) => {
    setData(data);
  }
  return (
    <div>
      <SearchBar />
      <CollectionBar />
      <MyList customType={CAROUSEL_TYPE.HOME} data={data.slice(8,14)} listTitle="Editor choice" listDescription="Tasty recipes catching our eye"/>
      <MyList customType={CAROUSEL_TYPE.HOME} data={data.slice(0,7)} listTitle="Recent Raves" listDescription="Trending recipes from our site"/>
      <CookingSpiner />
    </div>
  );
}
export default Home;