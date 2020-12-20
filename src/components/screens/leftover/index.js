import React, { useState }  from "react";
import { useDispatch, useSelector } from "react-redux";
import { ROUTER_KEY } from "../../../asset/constants/constants";
import "../../../utils/global.css"
import { CollectionBar, IngredientCard, Route } from "../../views";
import styles from './style.module.css'
function LeftOver() {
  const allIngredient = useSelector(state => state.searchReducer.mainIngredient)
  console.log("🚀 ~ file: index.js ~ line 9 ~ LeftOver ~ allIngredient", allIngredient)
  const [listIngredient, setListIngredient] = useState([ {
        title: 'New Ingredient',
        image: 'default'
      }]);
  const addIngredientHandel = () => {
      const newIng = {
        title: 'New Ingredient',
        image: 'default'
      }
      setListIngredient(listIngredient => [...listIngredient, newIng]);
  }
  const dispatch = useDispatch();
  var key = '';
  const handelSearchClick = () => {
        console.log("🚀 ~ file: index.js ~ line 23 ~ LeftOver ~ key", key)
  }
  return (
    <div>
      <Route route={ROUTER_KEY.LEFTOVER}/>
      <div className={styles.row}>
        {listIngredient.map((obj, index) => {
          return ( 
            <div className={styles.cardContain} key={index}>
              <IngredientCard title={obj.title}  onSubmit={(id)=> {if (id) key = key + id }} data={allIngredient}/>
            </div>);  
        })}
      </div>     
      <div className={styles.rowBtn}>
        <button className={styles.blueBtn} onClick={handelSearchClick}>Search</button>
        <button className={styles.redBtn} onClick={addIngredientHandel}>Add Ingredient</button>
        <button className={styles.redBtn} onClick={()=> setListIngredient([{ title: 'New Ingredient', image: 'default' }])}>Clear</button>
      </div>
      <CollectionBar/>
    </div>
  );
}
export default LeftOver;