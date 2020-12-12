
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import  styles from './style.module.css'
import Modal from 'react-modal';
import MultilineInput from '../MultilineInput'
import { useDispatch, useSelector } from "react-redux";
import { userSendReview } from "../../../redux/action/userAction";
import CustomRating from "../CustomRating";

const MyModal = (props, ref) => {
  const [modalIsOpen,setIsOpen] = useState(false);
  const idRecipies = props?.id;
  const token = useSelector(state => state.authReducer.accessToken)
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
  const inputRef = useRef();
  const rateRef = useRef();
  const dispatch = useDispatch();
  const sendReviews = () => {
    const note = inputRef.current.getText();
    const rate = rateRef.current.getRate();
    if(note) {
      dispatch(userSendReview(idRecipies,token, rate, inputRef.current.getText(), handelReview));
    }
  }
  const handelReview = (review) =>{
    closeModal();
    console.log("🚀 ~ file: index.js ~ line 36 ~ handelReview ~ review", review) 
  }
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
          <button  className={styles.btn} onClick={closeModal}>close</button>
          <h2 className={styles.title}>Add reivews</h2>
          <CustomRating ref={rateRef}/>
          <div className={styles.form}>
            <MultilineInput ref={inputRef}/>
            <button  className={styles.submitbtn} onClick={()=>sendReviews()}>Add</button>
          </div>
        </Modal> 
   );
}
export default forwardRef(MyModal);

