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
import { useHistory, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import ReactPaginate from "react-paginate";

const  Planner = ({props}) => {
  const modalRef = useRef()

  const planner = useSelector(state => state.planReducer.listPlanner)
  const [listPlanner, setlistPlanner] = useState()
  const [listPlannerDisplay, setlistPlannerDisplay] = useState()

  useEffect(() => {
    setlistPlanner(planner);
    setlistPlannerDisplay(planner)
  }, [planner])

  const location = useLocation();
  const id = location?.state?.id;
  const name = location?.state?.name;
  useEffect(() => {
    if (id || name) modalRef.current.openModal();
  }, [id, name])
  const [value, onChange] = useState( );
  const onPickDate = (date) => {
    onChange(date)
    const newList = planner?.filter(x => x.date === moment(date).format("DD-MM-YYYY"))
    setlistPlannerDisplay(newList);
    if (id || name) modalRef.current.openModal(); 
  }
  const numOfPage = Math.floor(listPlanner?.length / 5) + 1;
  const [pageNumber, setpageNumber] = useState(1);
  const handlePageClick = (data) => {
    setpageNumber(data.selected + 1);
  };

  return (
    <div className={styles.page}>
      <Route route={ROUTER_KEY.PLANNER} />
      <div className={styles.body}>
      <div style={{display: 'flex', flex: 1, flexDirection: 'column',   alignItems: 'center', position: 'relative'}}>
          <Calendar
            className={styles.calendarContain}
            onChange={(date) => onPickDate(date)}
            value={value}
            tileClassName={({ date, view }) => {
              if (listPlanner?.find(x => x.date === moment(date).format("DD-MM-YYYY"))) {
                return styles.highlight
              }
            }}
          />
          <button className={styles.btn} onClick={() => setlistPlannerDisplay(planner)}>Clear day</button>
      </div>
       
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column',   alignItems: 'center' }}>
        <h2 style={{margin: 4, padding: 0}}>List Planner</h2>
          <hr
            style={{
              color: '#00000080',
              backgroundColor: '#00000080',
              height: 3,
              borderRadius: 5,
              width: '80%'
            }}
          />
          {listPlannerDisplay ? (
            <div style={{ marginLeft: 40 }}>
              {listPlannerDisplay?.map((obj, index) => {
                if (index < pageNumber * 5 && index >= (pageNumber - 1) * 5)
                  return (
                    <div key={index} style={{ marginTop: 20 }}>
                      <PlanerObj data = {obj}/>
                    </div>
                  );
                return null;
              })}
              {listPlannerDisplay.length > 5 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                  <ReactPaginate
                    previousLabel={'previous'}
                    nextLabel={'next'}
                    brAnheakLabel={'...'}
                    breakClassName={'break-me'}
                    pageCount={numOfPage}
                    marginPagesDisplayed={2}
                    pageRangeDisplayed={5}
                    onPageChange={handlePageClick}
                    containerClassName={"pagination"}
                    previousLinkClassName={"pagination__link"}
                    nextLinkClassName={"pagination__link"}
                    disabledClassName={"pagination__link--disabled"}
                    activeClassName={"pagination__link--active"} />
                </div>
              )}
            </div>
          ) : (
              <div className={styles.emptyReview}>
                {/* <div style={{ width: 250, height: 200 }} ref={(e) => animtaionRef.current = e} /> */}
                <h2 style={{ margin: 0, padding: 0, textAlign: 'center' }}>This recipe doesn't have any listPlanner, let be the first one  </h2>
              </div>
            )}
        </div>
      </div>
      <PlannerModal ref={modalRef} date={moment(value).format("DD-MM-YYYY")} defaultId={id} name={name}/>
    </div>
  );
}
export default Planner;

const PlanerObj = (props) => {
  const data = props.data;
  const history = useHistory();
  return (
    <div style={{display: 'flex', padding: 2, background: '#ffffff80', borderRadius: 10}} className={styles.item}
      onClick={() => history.push({
        pathname: ROUTER_KEY.ONE_RECIPIE,
        state: data?.recipeID,
      })}>
      <div>
        <p style={{ margin: 5, padding: 0 }}>Data: {data.date}</p>
        <p style={{ margin: 5, padding: 0 }}>Time: {data.time}</p> 
      </div>
      <div>
        <p style={{ margin: 5, padding: 0 }}>Note: {data.note}</p>
        <p style={{ margin: 5, padding: 0 }}>Recipies: {data?.recipeID?.name}</p> 
      </div>
    </div>
  );
}