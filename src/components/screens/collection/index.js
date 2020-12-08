import React from "react";
import styles from './style.module.css'
import { ROUTER_KEY, ITEM, CAROUSEL_TYPE } from "../../../asset/constants/constants";
import { MyList, Route } from "../../views";

function Collection() {

  return (
    <div>
      <Route route={ROUTER_KEY.COLLECTION}/>
      <MyList shadow={false} customType={CAROUSEL_TYPE.NORMAL} data={ITEM} listTitle="My Favorite" listDescription="Tasty recipes catching our eye"/>
      <MyList shadow={false} customType={CAROUSEL_TYPE.NORMAL} data={ITEM} listTitle="Recent Visited" listDescription="Trending recipes from our site"/>  
    </div>
  );
}
export default Collection;