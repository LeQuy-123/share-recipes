const ROUTER_KEY = {
    SIGNIN: '/signin',
    LOGIN: '/login',
    HOME: '/',
    COLLECTION: '/collection',
    PLANNER: '/planner',
    MYRECIPIES: '/myrecipies',
    LEFTOVER: '/leftover',
    MYPAGE: '/mypage',
    RECIPIES: '/recipies',
    ONE_RECIPIE: '/recipie'
}
const MENU_ITEM = [
    {
     name:"Planner" ,
     navTo: ROUTER_KEY.PLANNER,
     tip: 'Plans meal days, weeks, or month in advance',
    },
   {
     name:"My Recipies" ,
     navTo: ROUTER_KEY.MYRECIPIES,
     tip: 'Organize all your recipes',
     },
     {
     name:"Collection" ,
     navTo: ROUTER_KEY.COLLECTION,
     tip: 'Click to see our wonderful collection',
    },
    {
     name:"Use up leftover" ,
     navTo: ROUTER_KEY.LEFTOVER,
     tip: 'Use up all your leftover!',
    }
]
const APP_NAME = "Share Recipies"
const BASE_URL = "https://cooking-recipe-api.herokuapp.com/api"
const HIDE_HEADER_LIST = [
    ROUTER_KEY.LOGIN,
    ROUTER_KEY.SIGNIN
]
const CAROUSEL_TYPE = {
    HOME: "HOME",
    NORMAL: "NORMAL"
}
const ITEM= [
  {
      title: "Fired Food",
      rate: 5,
  },
   {
      title: "Bread",
      rate: 4,
  },
   {
      title: "Soft Drink",
      rate: 3.6
  },
   {
      title: "Sweet",
      rate: 5,
  },
   {
      title: "10 Minutes Treat",
      rate: 4.7,
  },
     {
      title: "Sweet",
      rate: 5,
  },
   {
      title: "10 Minutes Treat",
      rate: 4.7,
  },
]
const FACEBOOK_APP_ID = "3826241150774372";
export { ROUTER_KEY, MENU_ITEM, APP_NAME, BASE_URL, HIDE_HEADER_LIST, CAROUSEL_TYPE, ITEM, FACEBOOK_APP_ID}