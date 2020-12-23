import axios from 'axios';
import { BASE_URL } from '../asset/constants/constants';

let API = axios.create({
  baseURL: BASE_URL,
  timeout: 7000,
  headers: {
    Accept: 'application/json',
    'Content-type': 'application/json',
  },
});
//! log URL API
// API.interceptors.response.use((response) => {
//   if (response?.request?.responseURL)
//     console.log(
//       'URL ->',
//       decodeURI(
//         response?.request?.responseURL.replace('', ''),
//       ),
//     );

//   return response;
// });
export default API;
