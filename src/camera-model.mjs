import {TIMING,geometryStart} from './model.mjs';
// Camera ownership is independent of the formation clock.
export const createCameraControl=()=>({userOwned:false,interacting:false,lastInput:-Infinity,lastFormationInput:-Infinity});
export function takeCameraControl(control,time,now){
 control.userOwned=true;control.interacting=true;control.lastInput=now;control.lastFormationInput=time;
}
export function releaseCameraControl(control,now){control.interacting=false;control.lastInput=now;}
export function resetCameraControl(control){Object.assign(control,createCameraControl());}
export function restartCameraTimeline(control){control.lastFormationInput=-Infinity;}
export const canGuideCamera=(control,guided,reset)=>!control.userOwned&&!control.interacting&&(guided||reset);
export function canFrameGeometry(control,playing,time,count,now){
 const revealStart=geometryStart({count})+TIMING.revealHold;
 return control.userOwned&&!control.interacting&&playing&&time>=revealStart&&time<revealStart+TIMING.revealMove
  &&control.lastFormationInput<revealStart&&now-control.lastInput>1000;
}
// A needed final pullback keeps both the user's orbit direction and target.
// Never move closer or chase a camera gesture during the reveal.
export function geometryFramingDistance(distance,recommended,delta){
 return distance+Math.max(0,recommended-distance)*(1-Math.exp(-Math.min(delta,.1)*1.5));
}
