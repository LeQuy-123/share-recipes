
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import  styles from './style.module.css'
import Modal from 'react-modal';
import { useDispatch, useSelector } from "react-redux";
import { BsFillCaretLeftFill, BsFillCaretRightFill } from "react-icons/bs";

import Slider from '@material-ui/core/Slider';
import { userCreateRecipes } from "../../../../redux/action/userAction";

const infoForm = [
  {title: 'Name recipies', type: 'text'},
  {title: 'Description', type: 'text'},
  {title: 'Category', type: 'text'}, 
  {title: 'Level', type: 'slide'}, 
  // {title: 'Image'}, 
]
// "prep": "1 hour 15 minutes",
//         "cook": "15 minutes",
//         "total": "1 hour 30 minutes",
//         "servings": "10",
//         "yield": "10 servings",
//         "nutrition_facts": "Calories: 369.4 , Sugar: 21.4g, Fat: 15.8g, Carbohydrates: 24.7g, Protein: 31.1g"
//     }
const info = [
  {title: 'Prepare time', type: 'text'},
  {title: 'Cook time', type: 'text'},
  {title: 'Servings', type: 'text'}, 
  {title: 'Nutrition facts', type: 'text'}, 
  // {title: 'Image'}, 
]
const ModalCreate = (props, ref) => {
  const [modalIsOpen,setIsOpen] = useState(false);
  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsOpen(true);
    },
    closeModal: () => {
      setIsOpen(false)
    }
  }));
  function closeModal(){
    setIsOpen(false);
    setStep(0);
     setInfoc([]);
      setListStep([ {
        title: 'New Ingredient',
        image: 'default'
      }]);
      setListIngredient([ {
        title: 'New Ingredient',
        image: 'default'
      }]);
      setMoreInfo([]);
      setStep(0);
  } 
  const [step, setStep] = useState(0)
   const [listStep, setListStep] = useState([ {
        title: 'New Step',
        image: 'default'
      }]);
  const addStepHandel = () => {
   const newStep = {
        title: 'New Step',
        image: 'default'
      }
    setListStep(step => [...step, newStep]);
  }

  const [listIngredient, setListIngredient] = useState([ {
        title: 'New Ingredient',
        image: 'default'
      }]);
  const addIngredientHandel = () => {
   const newIng = {
        title: 'New Ingredient',
        image: 'default'
      }
    setListIngredient(listIngredient => [...listIngredient, newIng]);
  }
  const infoRef = useRef([])
  const ingredientRef = useRef([])
  const stepRef = useRef([])
  const moreInfoRef = useRef([])
  const [infoc, setInfoc] = useState([]);
  const [ingredient, setIngredient] = useState([]);
  const [stepC, setStepC] = useState([]);
  const [moreInfo, setMoreInfo] = useState([]);
  const dispatch = useDispatch();
  const token = useSelector(state => state.authReducer.accessToken);
  const onNextPress = () => {
    if(step === 0) {
        const data = [];
        infoForm.forEach((obj, index) => {
          const newInfo =  infoRef.current[index].getData();
          data.push(newInfo)}) 
        setInfoc(data);
    }
    if(step === 1) {
        const data = [];
        listIngredient.forEach((obj, index) => {
          const newInfo =  ingredientRef.current[index].getData();
          data.push({content: newInfo})}) 
        setIngredient(data);
    }
    if(step === 2) {
        const data = [];
        listStep.forEach((obj, index) => {
          const newInfo =  stepRef.current[index].getData();
          data.push({content: newInfo})}) 
        setStepC(data);
    }
     if(step === 3) {
        const data = [];
        info.forEach((obj, index) => {
          const newInfo =  moreInfoRef.current[index].getData();
          data.push(newInfo)}) 
        setMoreInfo(data);
    }

     if(step === 4) {
      const recipes =
        {
          recipe: {
            name: infoc[0],
            des: infoc[1],
            category: infoc[2],
            img_url: "https://imagesvc.meredithcorp.io/v3/mm/image?url=https%3A%2F%2Fimages.media-allrecipes.com%2Fuserphotos%2F3294690.jpg&w=272&h=272&c=sc&poi=face&q=85",
            level: infoc[3],
            rate: '5',
            num_of_reviews: '0'
          },
          ingredients: [],
          steps: [],
          tags: [],
          pictures: [],
          prep_time: {
            prep:  moreInfo[0],
            cook:   moreInfo[1],
            total:   moreInfo[1],
            yield:   moreInfo[2],
            servings: moreInfo[2] + " servings",
            nutrition_facts:   moreInfo[3]
          }
      }
      recipes.ingredients = ingredient;
      recipes.steps = stepC;
       dispatch(userCreateRecipes(recipes,token))
      setInfoc([]);
      setListStep([ {
        title: 'New Ingredient',
        image: 'default'
      }]);
      setListIngredient([ {
        title: 'New Ingredient',
        image: 'default'
      }]);
      setMoreInfo([]);
      setStep(0);
    }
    if(step < 4) setStep(step + 1); else {setStep(0); closeModal()}
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
          <button  className={styles.closeBtn} onClick={closeModal}>Close</button>
          <h2 className={styles.title}>Create your own recipie here</h2>
          {step === 0 && 
          <div  className={styles.body}>
              {infoForm.map((obj, index) => {
                return <InfoRow key={index} ref={(e) => infoRef.current[index] = e} title={obj.title} type={obj.type}/>
              })}
          </div>}
          {step === 1 && 
          <div  className={styles.body}>
            <h3 style={{margin: 5}}> Write all of the Ingredient you need here </h3>
               {listIngredient.map((obj, index) => {
                  return ( 
                    <div key={index} className={styles.cardContain} key={index}>
                       <InfoRow ref={(e) => ingredientRef.current[index] = e} title={index} type='text'/>
                  </div>);  
                })}
                <button className={styles.redBtn} onClick={addIngredientHandel}>Add Ingredient</button>
          </div>}
          {step === 2 && 
          <div  className={styles.body}>
            <h3 style={{margin: 5}}>Now tell us how to cook your repies step by step: </h3>
               {listStep.map((obj, index) => {
                  return ( 
                    <div key={index} className={styles.cardContain} key={index}>
                       <InfoRow ref={(e) => stepRef.current[index] = e} title={index} type='text'/>
                  </div>);  
                })}
                <button className={styles.redBtn} onClick={addStepHandel}>Add Step</button>
          </div>}
           {step === 3 && 
          <div  className={styles.body}>
            <h3 style={{margin: 5, textAlign: 'center'}}> Now add some more info </h3>
             {info.map((obj, index) => {
                return <InfoRow key={index} ref={(e) => moreInfoRef.current[index] = e} title={obj.title} type={obj.type}/>
              })}
          </div>}
          {step === 4 && 
          <div  className={styles.body}>
            <h3 style={{margin: 5, textAlign: 'center'}}> Done, now save your recipies in our database and share it with every one in the world </h3>
          </div>}
          
          <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
           {/* {step !== 0  &&
              <button className={styles.buttonBack} onClick={()=> {if(step > 0) setStep(step -1 )}} >
               <BsFillCaretLeftFill size={30} style={{marginRight: 20}} color="white"/>   Previus 
             </button>}  */}
             <button className={styles.button} onClick={()=> onNextPress()}>
             {step === 4 ? 'Save recipes' : 'Next'}
             {step !== 4 && <BsFillCaretRightFill size={30} style={{marginLeft: 20}} color="white"/>}  
          </button>   
          </div>     
        </Modal> 
   );
}
export default forwardRef(ModalCreate);

const InfoRow = forwardRef((props, ref) => {
  const [data, setdata] = useState();
  useImperativeHandle(ref, () => ({
    getData: () =>  {return data}
  }));
  const {title, type} = props;
    return (
      <div style={{display: 'flex', height: 50, alignItems: 'center', marginTop: 10 }}>
        <h3 style={{width: 160}}>{title} :</h3>
        {type === "text"  && <input className={styles.inputText} type="text" onChange={(v)=> {setdata(v.target.value)}}/> }
        {type === "slide" && 
          <Slider
            style={{width: '25vw',minWidth: 100}}
            defaultValue={0}
            getAriaValueText={(value) => setdata(value)}
            step={1}
            marks
            min={0}
            max={5}
            valueLabelDisplay="auto"
          />}
      </div>
    );
})
