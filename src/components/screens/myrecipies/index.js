import lottie from "lottie-web";
import React, { useEffect, useRef } from "react";
import {  ROUTER_KEY } from "../../../asset/constants/constants";
import "../../../utils/global.css"
import {   Route } from "../../views";
import styles from './style.module.css';
import owl from '../../../asset/lottie/16788-owlie-looking-around.json'
import ModalCreate from './ModalCreate'

function MyRecipies() {
  const animtaionRef = useRef()
  const modalRef = useRef()
  useEffect(() => {
      lottie.loadAnimation({
      container: animtaionRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: owl,
    });
  }, []) 
   return (
    <div>
      <Route route={ROUTER_KEY.MYRECIPIES}/>
      <div>
        <div className={styles.row}>
          <div style={{ width: 300 }} ref={(e) => animtaionRef.current = e}/>
          <h2>
             You dont have any recipies, let create one
          </h2>
        </div>
        <div className={styles.rowBtn}>
          <button className={styles.button} onClick={()=> modalRef.current.openModal()}>Create recipies</button>
        </div>
      </div>
      <ModalCreate ref={modalRef}/>
    </div>
  );
}
export default MyRecipies;
