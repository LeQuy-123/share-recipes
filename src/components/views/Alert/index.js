
import React, { Component }  from "react";
import ReactJsAlert from "reactjs-alert"
import  styles from './style.module.css'

export default class MyAlert extends Component {
  static instance = null;

  constructor(props) {
    super(props)
    MyAlert.instance = this;
    this.state = {
      type: "error",
      status: false,
      title: "Hey! this is an error.",
      quote: "Something went wrong. Please try again!",
    };
  }

  static show(type, title, quote) {
    if (MyAlert.instance) {
      MyAlert.instance.setState({  
        type: type,
        status: true,
        title: title,
        quote: quote
     });
    }
  }

  static hide() {
    if (MyAlert.instance) {
      MyAlert.instance.setState({ status: false });
    }
  }
  render() {
    return (
      <div className="App">
        <ReactJsAlert
          type={this.state.type} // success, warning, error, info
          title={this.state.title} // title you want to display
          status={this.state.status} // true or false
          quote={this.state.quote}
          Close={() => this.setState({ status: false })}
        />
      </div>
    );
  }
}

