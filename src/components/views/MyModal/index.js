
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import  styles from './style.module.css'
import Modal from 'react-modal';

const MyModal = (props, ref) => {
  const [modalIsOpen,setIsOpen] = useState(false);
  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
    },
    closeModal: () => {
      setIsOpen(false);
    }
  }));
  function closeModal(){
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
  }
    return (
        <Modal
          className={styles.modal}
          isOpen={modalIsOpen}
          // onAfterOpen={afterOpenModal}
          onRequestClose={closeModal}
          // style={customStyles}
          contentLabel="Add reivews"
        >
          <button  className={styles.btn} onClick={closeModal}>close</button>
          <h2 className={styles.title}>Add reivews</h2>
          <form className={styles.form}>
            <textarea className={styles.input} rows="5" />
            <input type="submit"  className={styles.submitbtn}/>
            {/* <input type="button" className={styles.btn}>Add</input> */}
          </form>
        </Modal> 
   );
}
export default forwardRef(MyModal);

