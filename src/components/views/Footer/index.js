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
        <Link to={ROUTER_KEY.HOME} className={styles.footerItem}>
           Contact
        </Link>
        <Link to={ROUTER_KEY.HOME} className={styles.footerItem}>
            Social
        </Link>
        <Link to={ROUTER_KEY.HOME} className={styles.footerItem}>
            Suport
        </Link>
    </div>
   );
}
export default Footer;

