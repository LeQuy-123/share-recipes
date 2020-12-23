import React, { useState }  from "react";
import { useDispatch, useSelector } from "react-redux";
import { ROUTER_KEY } from "../../../asset/constants/constants";
import "../../../utils/global.css"
import { CollectionBar, IngredientCard, MySpinner, Route } from "../../views";
import { guestSearchByIngredient } from '../../../redux/action/guestAction'
import styles from './style.module.css'
import { useHistory } from "react-router-dom";
  var key =  [];

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
  const history = useHistory();
  const dispatch = useDispatch();
  const handelSearchClick = () => {
        MySpinner.show();
    dispatch(guestSearchByIngredient(key.toString(), history, MySpinner))
  }
  return (
    <div>
      <MySpinner />
      <Route route={ROUTER_KEY.LEFTOVER}/>
      <div className={styles.row}>
        {listIngredient.map((obj, index) => {
          return ( 
            <div className={styles.cardContain} key={index}>
              <IngredientCard title={obj.title}  onSubmit={(id)=> {if(id) {console.log(id); key.push(id?.toString()) }}} data={allIngredient}/>
            </div>);  
        })}
      </div>     
      <div className={styles.rowBtn}>
        <button className={styles.blueBtn} onClick={handelSearchClick}>Search</button>
        <button className={styles.redBtn} onClick={addIngredientHandel}>Add Ingredient</button>
        <button className={styles.redBtn} onClick={()=> {setListIngredient([]);key=[]}}>Clear</button>
      </div>
      <CollectionBar/>
    </div>
  );
}
export default LeftOver;