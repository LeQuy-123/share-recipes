
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import  styles from './style.module.css'
import Modal from 'react-modal';
import MyAlert from "../../../views/Alert";
import TimePicker from "react-time-picker";
import { useDispatch, useSelector } from "react-redux";
import { userCreatePlanner } from "../../../../redux/action/userAction";

const PlannerModal = (props, ref) => {
  const { date } = props;
  const dispatch = useDispatch();
  const token = useSelector(state => state.authReducer.accessToken);

  const [modalIsOpen,setIsOpen] = useState(false);
  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
    },
    closeModal: () => {
      setIsOpen(false)
    }
  }));
  const handelSave = () => {
    const planer = {
      date: date,
      hours: timeRef.current.getTime(),
      note: noteRef.current.getData(),
      recipeID: props.defaultId ? props.defaultId : null
    }
    dispatch(userCreatePlanner(planer, token, onSuccess));
    console.log("🚀 ~ file: index.js ~ line 30 ~ handelSave ~ planer", planer)
    setIsOpen(false)
  }
  const onSuccess = (res) => {
    console.log("🚀 ~ file: index.js ~ line 36 ~ onSuccess ~ res", res)
  }
  const noteRef = useRef();
  const timeRef = useRef();
 
  return (
    <Modal
      className={styles.modal}
      isOpen={modalIsOpen}
      onRequestClose={() => setIsOpen(false) }
      // style={customStyles}
      contentLabel="Add reivews"
      ariaHideApp={false}>
      {/* {date} */}
      <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>Close</button>
      <h3 style={{marginTop: 30}}>Create your own personal planner</h3>
      <InfoRow title='Note ' type = 'text' ref={noteRef}/>
      <InfoRow title='Date ' value={date} type = 'date' />
      <InfoRow title='Time ' type='time' ref={timeRef}/>
      <InfoRow title='Recipes ' type= 'date' value={props.name} />
      <button className={styles.button} onClick={()=>handelSave()}>Save plan</button>
    </Modal> 
   );
}
export default forwardRef(PlannerModal);
const InfoRow = forwardRef((props, ref) => {
  const { title, value, type } = props;

  const [data, setdata] = useState(value ? value : null);
  const [time, setTime ] = useState('12:00');

  useImperativeHandle(ref, () => ({
    getData: () => { return data },
    getTime: () => { return time }
  }));
  return (
    <div style={{ display: 'flex', height: 50, alignItems: 'center', marginTop: 10 }}>
      <h3 style={{ width: 100 }}>{title} :</h3>
      {type === 'text' &&
        <input className={styles.inputText} type="text" onChange={(v) => { setdata(v.target.value) }} />
      }
      {type === 'date' &&
        <p className={styles.inputText}>{value}</p>       
      }
      {type === 'time' &&
        <TimePicker
          onChange={(data) => setTime(data) }
          value={time}
        />
      }
    </div>
  );
})
