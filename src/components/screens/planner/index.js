// import lottie from "lottie-web";
import React, { useRef, useState }  from "react";
import "../../../utils/global.css"
// import working from '../../../asset/lottie/36572-under-maintenance.json'
import styles from './style.module.css'
import Calendar from 'react-calendar';
import { Route } from "../../views";
import { ROUTER_KEY } from "../../../asset/constants/constants";
import moment from 'moment';
import PlannerModal from "./PlannerModal";

function Planner() {
  const modalRef = useRef()
 
  const mark = [
    '04-01-2021',
    '01-01-2021',
    '05-01-2021'
  ]
  const [value, onChange] = useState( );
  const onPickDate = (date) => {
    onChange(date)
    modalRef.current.openModal();
  }
  return (
    <div className={styles.page}>
      <Route route={ROUTER_KEY.PLANNER} />
      <div style={{display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <Calendar
          className={styles.calendarContain}
          onChange={(date) => onPickDate(date)}
          value={value}
          tileClassName={({ date, view }) => {
            if (mark.find(x => x === moment(date).format("DD-MM-YYYY"))) {
              return styles.highlight
            }
          }}
        />
      </div>
      <PlannerModal ref={modalRef} date={moment(value).format("DD-MM-YYYY")}/>
    </div>
  );
}
export default Planner;