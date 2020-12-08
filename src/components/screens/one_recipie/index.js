import React, { useEffect, useState }  from "react";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { ROUTER_KEY } from "../../../asset/constants/constants";
import { guestViewRecipie } from "../../../redux/action/guestAction";
import { CollectionBar, MyLoader, RecipiesHeader, RecipiesReviews, Route } from "../../views";
import styles from './style.module.css';

function OneRecipie() {
  const history = useHistory();
  const recipiesData = history.location.state;
  const dispatch = useDispatch();
  const [isLoading, setisLoading] = useState(true);
  const [data, setdata] = useState();
  const onDone = (recipies) => {setisLoading(false); setdata(recipies)}
  useEffect(() => {
    dispatch(guestViewRecipie(recipiesData.id, onDone));
  }, [])
  return (
    <div className={styles.body}>
      <Route route={ROUTER_KEY.MYRECIPIES}/>
      <div className={styles.row}>
        <div className={styles.containRecipies}>
          <RecipiesHeader 
            id={recipiesData.id}
            image={recipiesData.img_url} name={recipiesData.name}
            des={recipiesData.des}
            rating={recipiesData.rate}
          />
        {isLoading ? (
         <MyLoader height={900} />
        ): (
        <div className={styles.view}>
          <h3 className={styles.recipiesTitle}>Ingredient: </h3>
          <ol>
            {data?.Ingredients.map((obj, index) => {
              return <li key={index}><p style={{fontSize: 14}}>{obj.content}</p></li>
            })}
          </ol>
           <h3 className={styles.recipiesTitle}>Step: </h3>
          <ol>
            {data?.Steps.map((obj, index) => {
              return <li key={index}><p style={{fontSize: 14}}>{obj.content}</p></li>
            })}
          </ol>
        </div>
        )}
        </div>
        <div className={styles.review}>
          <RecipiesReviews data={data?.Reviews} />      
        </div>
      </div>
      <CollectionBar />
    </div>
  );
}
export default OneRecipie;