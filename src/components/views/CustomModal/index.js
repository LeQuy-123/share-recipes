
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import  styles from './style.module.css'
import Modal from 'react-modal';
import { useDispatch } from "react-redux";
import { userForgetPassword } from "../../../redux/action/userAction";


const CustomModal = (props, ref) => {
  const [modalIsOpen,setIsOpen] = useState(false);
  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
    },
    closeModal: () => {
      setIsOpen(false);
    },

  }));
  function closeModal(){
    setIsOpen(false);
  }
  function openModal() {
    setIsOpen(true);
  }
  const [email, setEmail] = useState();
  function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }
  const dispatch = useDispatch();
  const handelConfrim = () => {
    if(validateEmail(email)) {
      dispatch(userForgetPassword(email, handelSuccses, handelError));
    }
  }
  const handelSuccses = (message) => {
    setNote(message)
  }
  const handelError = (message) => {
    setNote(message)
  }
  const [note, setNote] = useState();
    return (
        <Modal
          className={styles.modal}
          isOpen={modalIsOpen}
          // onAfterOpen={afterOpenModal}
          onRequestClose={closeModal}
          // style={customStyles}
          contentLabel="Add reivews"
          ariaHideApp={false}
        >
          <h3 style={{margin: 0, padding: 0}}>Email: </h3>
          <input className={styles.input} type="text" onChange={(v)=> {setEmail(v.target.value)}}/>
          <button style={{alignSelf: 'center', marginTop: 20}} className={styles.buttonLogin} onClick={()=>handelConfrim()}>Confrim</button>
          <p>{note}</p>
        </Modal> 
   );
}
export default forwardRef(CustomModal);

