
const HandelError =(error, onErrorCallBack) => {
console.log("🚀 ~ file: handelError.js ~ line 3 ~ HandelError ~ error", error)
    if (error.response) {
      // Request made and server responded
      console.log(error.response.data);
      if(error.response.status === 401) onErrorCallBack('This email is already connected to an account')
      else  onErrorCallBack(error?.response?.data?.message)
    } else if (error.request) {
      // The request was made but no response was received
      console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error when setting up resuqest', error.message);
    }
}
export default HandelError;
