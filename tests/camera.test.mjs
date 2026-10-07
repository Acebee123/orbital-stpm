import test from 'node:test';
import assert from 'node:assert/strict';
import {createCameraControl,takeCameraControl,releaseCameraControl,resetCameraControl,restartCameraTimeline,canGuideCamera,canFrameGeometry,geometryFramingDistance} from '../src/camera-model.mjs';
import {CONFIG,duration,geometryStart,TIMING} from '../src/model.mjs';

test('dragging yields guidance immediately, and releasing never restores it on a timer',()=>{
 const control=createCameraControl();assert.equal(canGuideCamera(control,true,false),true);
 takeCameraControl(control,4,1000);assert.equal(canGuideCamera(control,true,true),false);
 releaseCameraControl(control,1200);
 for(const now of [1200,5000,60000]){assert.equal(canGuideCamera(control,true,false),false);assert.equal(canFrameGeometry(control,true,5,4,now),false);}
});
test('pause, play, replay and step changes preserve user ownership until explicit Reset View',()=>{
 const control=createCameraControl();takeCameraControl(control,12,0);releaseCameraControl(control,100);
 for(const guided of [false,true,false,true])assert.equal(canGuideCamera(control,guided,false),false);
 restartCameraTimeline(control);assert.equal(control.userOwned,true);assert.equal(canGuideCamera(control,true,false),false);
 resetCameraControl(control);assert.equal(canGuideCamera(control,false,true),true);assert.equal(canGuideCamera(control,true,false),true);
});
test('only the important final reveal may reframe a quiet manually inspected view in all modes',()=>{
 for(const config of Object.values(CONFIG)){
  const control=createCameraControl(),start=geometryStart(config)+TIMING.revealHold;
  takeCameraControl(control,5,0);releaseCameraControl(control,100);
  for(const t of [2,8.5,10,start-.01,duration(config)])assert.equal(canFrameGeometry(control,true,t,config.count,5000),false);
  assert.equal(canFrameGeometry(control,true,start+1,config.count,5000),true);
  assert.equal(canFrameGeometry(control,false,start+1,config.count,5000),false);
  takeCameraControl(control,start+.1,5100);assert.equal(canFrameGeometry(control,true,start+1,config.count,7000),false);
  releaseCameraControl(control,5200);assert.equal(canFrameGeometry(control,true,start+2,config.count,8000),false);
 }
});
test('final framing is damped, never zooms in and preserves an arbitrary user angle',()=>{
 const direction=[-.3,.4,-Math.sqrt(.75)],target=[-.55,.25,0];let distance=5;
 for(let i=0;i<180;i++){
  const next=geometryFramingDistance(distance,10.5,1/60);assert.ok(next>=distance&&next<=10.5);
  const position=target.map((v,k)=>v+direction[k]*next);
  for(let k=0;k<3;k++)assert.ok(Math.abs((position[k]-target[k])/next-direction[k])<1e-12);
  distance=next;
 }
 assert.ok(distance>10.4);assert.equal(geometryFramingDistance(15,10.5,1/60),15);
});
