import lottie from 'lottie-web';
import React from 'react';
import styles from "./style.module.css";
import animationData from '../../../asset/lottie/cooking.json'
class CookingSpiner extends React.PureComponent {
  static instance = null;

  static show() {
    if (CookingSpiner.instance) {
      CookingSpiner.instance.setState({ visible: true });
    }
  }

  static hide() {
    if (CookingSpiner.instance) {
      CookingSpiner.instance.setState({ visible: false });
    }
  }

  constructor(props) {
    super(props);
    CookingSpiner.instance = this;
    this.state = {
      visible: false,
    };
    this.animation = null;
  }
  componentDidMount(){
    this.waveAnimation();
  }
  waveAnimation = () => {
    if (this.wave !== undefined) {
      const animation = {
        container: this.wave,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData:  animationData,
      };
      this.animation = lottie.loadAnimation(animation);
    }
  };
  render() {
    // if (CookingSpiner?.instance?.state?.visible) {
      // console.log('is show')
      return (
        <div className={styles.spin} 
          style={{display: this.state?.visible ? 'flex' : 'none' }}>
          <div className={styles.animation} 
          style={{ width: 700, height: 800 }} 
          ref={ref => {
            this.wave = ref;
          }}/>
        </div>
      );
    // } else {
    //   return null;
    // }
  }
}
export default CookingSpiner;
