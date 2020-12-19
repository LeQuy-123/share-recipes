/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect,  useRef,  useState } from "react";
import ava from '../../../asset/icon/default_avatar.png'
import styles from "./style.module.css";

import MyText from "../MyText";
import { useDispatch, useSelector } from "react-redux";
import { userUpdateInfo } from "../../../redux/action/userAction";
// import { REDUX } from "../../../redux/store/types";
// import { useDispatch } from "react-redux";
// import { userRegister } from "../../../redux/action/userAction";

const  MyPageHeader = (props, ref) => {
  const userData = useSelector(state => state.authReducer.userData);
  const token = useSelector(state => state.authReducer.accessToken)
  const [user, setUser] = useState(userData);
  useEffect(() => {
    setUser(userData);
  }, [userData])
   const dispatch = useDispatch();
   const userNameRef = useRef();
   return (
      <div className={styles.row}>
         <img src={user?.profileImage ? user.profileImage : ava}
              alt="Ava"
              className={styles.ava}
         />
        <div>
          <MyText
          ref={userNameRef}
           submit={e => {
             if(e.keyCode === 13) {
                dispatch(userUpdateInfo(userNameRef.current.getText(),token));
             }
          }} showEdit={true} title="User name">{user.username}</MyText>
          <MyText title="Email">{user.email}</MyText>
        </div>
      </div>
   );
}
export default MyPageHeader;

