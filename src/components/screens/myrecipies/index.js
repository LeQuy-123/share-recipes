import React from "react";
import { CAROUSEL_TYPE, ITEM, ROUTER_KEY } from "../../../asset/constants/constants";
import "../../../utils/global.css"
import { MyList, Route } from "../../views";

function MyRecipies() {
   return (
    <div>
      <Route route={ROUTER_KEY.MYRECIPIES}/>
      <MyList shadow={false} customType={CAROUSEL_TYPE.NORMAL} data={ITEM} />
      <button>Add more collection</button>
    </div>
  );
}
export default MyRecipies;