import React from 'react';
import Loader from 'react-loader-spinner';
import styles from "./style.module.css";

class MySpinner extends React.PureComponent {
  static instance = null;

  static show() {
    if (MySpinner.instance) {
      MySpinner.instance.setState({ visible: true });
    }
  }

  static hide() {
    if (MySpinner.instance) {
      MySpinner.instance.setState({ visible: false });
    }
  }

  constructor(props) {
    super(props);
    MySpinner.instance = this;
    this.state = {
      visible: false,
    };
  }
  render() {
    if (MySpinner?.instance?.state?.visible) {
      return (
        <div className={styles.spin}>
          <Loader
          type="Puff"
          color="#00BFFF"
          height={100}
          width={100}
          />
        </div>
      );
    }
    return null;
  }
}
export default MySpinner;
