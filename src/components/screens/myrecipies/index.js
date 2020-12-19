import React from "react";
import {  ROUTER_KEY } from "../../../asset/constants/constants";
import "../../../utils/global.css"
import {   Route } from "../../views";
import styles from './style.module.css';

function MyRecipies() {
   return (
    <div>
      <Route route={ROUTER_KEY.MYRECIPIES}/>
      <button>Add more collection</button>
    </div>
  );
}
export default MyRecipies;