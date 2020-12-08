
import React  from "react";
import  styles from './style.module.css'
import home from '../../../asset/icon/home.png'

const Route = (props, ref) => {
    return (
     <div className={styles.row}>
      <img src={home} alt="home_icon" className={styles.homeicon}/>
      <h2 className={styles.route}>Home{props.route}</h2>
    </div>
   );
}
export default Route;

