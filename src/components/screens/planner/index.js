import lottie from "lottie-web";
import React, { useEffect, useRef }  from "react";
import "../../../utils/global.css"
import working from '../../../asset/lottie/36572-under-maintenance.json'
import styles from './style.module.css'
function Planner() {
  const animtaionRef = useRef()
  useEffect(() => {
      lottie.loadAnimation({
      container: animtaionRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: working,
    });
  }, []) 
  return (
    <div className={styles.page}>
      <div style={{ width: 500 , height: 465}} ref={(e) => animtaionRef.current = e}/>
      <h2 style={{textAlign: 'center', width: 500}}>
      Unfortunately this site is down for a bit of maintenance right now. but soon we 'll be up</h2>
    </div>
  );
}
export default Planner;