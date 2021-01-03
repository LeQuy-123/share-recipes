// import lottie from "lottie-web";
import React, { useEffect, useRef, useState }  from "react";
import "../../../utils/global.css"
// import working from '../../../asset/lottie/36572-under-maintenance.json'
import styles from './style.module.css'
import Calendar from 'react-calendar';
import { Route } from "../../views";
import { ROUTER_KEY } from "../../../asset/constants/constants";
import moment from 'moment';
import PlannerModal from "./PlannerModal";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const  Planner = ({props}) => {
  const modalRef = useRef()

  const planner = useSelector(state => state.planReducer.listPlanner)
  console.log("🚀 ~ file: index.js ~ line 18 ~ Planner ~ planner", planner)
  const [listPlanner, setlistPlanner] = useState()
  useEffect(() => {
    setlistPlanner(planner);
  }, [planner])
  const location = useLocation();
  const id = location?.state?.id;
  const name = location?.state?.name;

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
            if (listPlanner.find(x => x.date === moment(date).format("DD-MM-YYYY"))) {
              return styles.highlight
            }
          }}
        />
      </div>
      <PlannerModal ref={modalRef} date={moment(value).format("DD-MM-YYYY")} defaultId={id} name={name}/>
    </div>
  );
}
export default Planner;