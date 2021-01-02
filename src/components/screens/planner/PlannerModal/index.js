
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import  styles from './style.module.css'
import Modal from 'react-modal';
import MyAlert from "../../../views/Alert";
import TimePicker from "react-time-picker";
import { useDispatch } from "react-redux";

const PlannerModal = (props, ref) => {
  const { date } = props;
  const [modalIsOpen,setIsOpen] = useState(false);
  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
    },
    closeModal: () => {
      setIsOpen(false)
    }
  }));
  const dispatch = useDispatch();
  const handelSave = () => {
     setIsOpen(false)
  }
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
      <InfoRow title='Note ' type = 'text'/>
      <InfoRow title='Date ' value={date} type = 'date' />
      <InfoRow title='Time ' type='time' />
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
    getData: () => { return data }
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
