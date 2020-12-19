import { ROUTER_KEY } from "../../../asset/constants/constants";
import React  from "react";
import { Link } from "react-router-dom";
import  styles from './style.module.css'

const Footer = (props, ref) => {
    return (
     <div className={styles.row}>
        <Link to={ROUTER_KEY.HOME} className={styles.footerItem}>
            About us
        </Link>
         <a href="https://www.facebook.com/profile.php?id=100011190183146" className={styles.footerItem}>
            Contact
        </a>
        <a href="https://www.facebook.com/profile.php?id=100010784611763" className={styles.footerItem}>
            Social
        </a>
         <a href="https://www.facebook.com/profile.php?id=100006792816768" className={styles.footerItem}>
            Suport
        </a>
    </div>
   );
}
export default Footer;

