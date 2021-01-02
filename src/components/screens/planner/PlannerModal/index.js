
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import  styles from './style.module.css'
import Modal from 'react-modal';
import MyAlert from "../../../views/Alert";

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
      <InfoRow title='Note: '/>
      <InfoRow title='Date: ' value={date} />
      <InfoRow title='Date: ' value={date} />
    </Modal> 
   );
}
export default forwardRef(PlannerModal);
const InfoRow = forwardRef((props, ref) => {
  const [data, setdata] = useState();
  useImperativeHandle(ref, () => ({
    getData: () => { return data }
  }));
  const { title, value } = props;
  return (
    <div style={{ display: 'flex', height: 50, alignItems: 'center', marginTop: 10, marginHorizontal: 20 }}>
      <h3 style={{ width: 100 }}>{title} :</h3>
      {value ? 
        <p className={styles.inputText}>{value}</p> :
        <input className={styles.inputText} type="text" onChange={(v) => { setdata(v.target.value) }} />
      }
    </div>
  );
})
