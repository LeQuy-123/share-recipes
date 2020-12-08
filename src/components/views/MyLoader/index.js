
import React  from "react";
import ContentLoader from "react-content-loader";
// import  styles from './style.module.css'

const MyLoader = (props, ref) => {
    return (
       <ContentLoader 
        speed={2}
        width={'100%'}
        height={props.height}
        backgroundColor="#f3f3f3"
        foregroundColor="#ecebeb"
        {...props}
        >
        <rect x="0" y="0" rx="0" ry="0" width="100%" height="100%" />
      </ContentLoader>  
   );
}
export default MyLoader;

