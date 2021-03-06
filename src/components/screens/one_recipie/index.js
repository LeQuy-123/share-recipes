import React, {  useRef }  from "react";
import { useHistory } from "react-router-dom";
import { ROUTER_KEY } from "../../../asset/constants/constants";
import { CollectionBar, RecipiesHeader, RecipiesReviews, Route } from "../../views";
import RecipeBody from "./body";
import styles from './style.module.css';

function OneRecipie() {
  const history = useHistory();
  const recipiesData = history.location.state;
  const bodyRef = useRef();
  return (
    <div className={styles.body}>
      <Route route={ROUTER_KEY.ONE_RECIPIE +'/' + recipiesData.name}/>
      <div className={styles.row}>
        <div className={styles.containRecipies}>
          <RecipiesHeader 
            id={recipiesData.id}
            image={recipiesData.img_url} name={recipiesData.name}
            des={recipiesData.des}
            rating={recipiesData.rate}
          />
          <button className={styles.btn} onClick={()=> bodyRef.current.toData()}><h2 className={styles.btn_text}>Recipies</h2></button>
          <button className={styles.btn} onClick={()=> bodyRef.current.toImage()}  style={{marginLeft: 4}}><h2 className={styles.btn_text}>Image</h2></button>
          <RecipeBody data={recipiesData} ref={bodyRef}/>
        </div>
        <div className={styles.review}>
          <RecipiesReviews data={recipiesData}/>      
        </div>
      </div>
      <CollectionBar />
    </div>
  );
}
export default OneRecipie;