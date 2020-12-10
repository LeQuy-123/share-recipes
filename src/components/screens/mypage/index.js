import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { CAROUSEL_TYPE, ROUTER_KEY } from "../../../asset/constants/constants";
import "../../../utils/global.css"
import {MyList, MyPageHeader, Route} from "../../views";
const ITEM= [
  {
      title: "Fired Food",
      rate: 5,
  },
   {
      title: "Bread",
      rate: 4,
  },
   {
      title: "Soft Drink",
      rate: 3.6
  },
   {
      title: "Sweet",
      rate: 5,
  },
   {
      title: "10 Minutes Treat",
      rate: 4.7,
  },
     {
      title: "Sweet",
      rate: 5,
  },
   {
      title: "10 Minutes Treat",
      rate: 4.7,
  },
]
function MyPage() {
  const favoriteList = useSelector(state => state.favoriteReducer.listFavorites)
  const [faveList, setfaveList] = useState(favoriteList);
  useEffect(() => {
    setfaveList(favoriteList);
  }, [favoriteList])
  return (
    <div>
    <Route route={ROUTER_KEY.MYPAGE}></Route>
    <MyPageHeader />
    <MyList shadow={false} customType={CAROUSEL_TYPE.NORMAL} data={faveList} listTitle="My Favorite" listDescription="Tasty recipes catching our eye"/>
    <MyList shadow={false} customType={CAROUSEL_TYPE.NORMAL} data={ITEM} listTitle="Recent Visited" listDescription="Trending recipes from our site"/>
    </div>
  );
}
export default MyPage;