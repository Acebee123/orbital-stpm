export const orbitalMotionType=key=>({'px':1,'py':2,'pz':3,'dxy':4,'dxz':5,'dyz':6,'dx2y2':7,'dz2':8}[key]??0);
// Visual flow only. Symmetry rotations preserve radial and angular density for
// s, p and dz2; other d orbitals use a small tangent drift bounded by node distance.
export function driftPoint(type,p,time,seed){
 const r=Math.hypot(...p);if(r<1e-8)return [...p];
 let axis;
 if(type===0)axis=[Math.sin(seed*2.7),Math.cos(seed*3.1),.45];
 else if(type===1||type===9)axis=[1,0,0];
 else if(type===2)axis=[0,1,0];
 else if(type===3||type===8)axis=[0,0,1];
 if(axis){
  const n=Math.hypot(...axis);axis=axis.map(v=>v/n);
  const angle=time*(.12+.10*(.5+.5*Math.sin(seed*4.3)))*(Math.sin(seed*6.1)<0?-1:1),c=Math.cos(angle),s=Math.sin(angle),d=p.reduce((sum,v,i)=>sum+v*axis[i],0);
  const cross=[axis[1]*p[2]-axis[2]*p[1],axis[2]*p[0]-axis[0]*p[2],axis[0]*p[1]-axis[1]*p[0]];
  return p.map((v,i)=>v*c+cross[i]*s+axis[i]*d*(1-c));
 }
 const [x,y,z]=p;
 const margin=type===4?Math.min(Math.abs(x),Math.abs(y)):type===5?Math.min(Math.abs(x),Math.abs(z)):type===6?Math.min(Math.abs(y),Math.abs(z)):Math.abs(Math.abs(x)-Math.abs(y));
 const a=Math.min(.055*r,.20*margin),q=p.map((v,i)=>v+a*(Math.sin(time*.32+seed+(i+1)*2.1)-Math.sin(seed+(i+1)*2.1)));
 const qr=Math.hypot(...q);return q.map(v=>v*r/qr);
}
export const particleDriftGLSL=`
vec3 driftPoint(vec3 p,float time,float seed,float type){
 float r=length(p);if(r<.00000001)return p;
 vec3 axis=vec3(0.);bool rotate=true;
 if(type<.5)axis=normalize(vec3(sin(seed*2.7),cos(seed*3.1),.45));
 else if(type<1.5||type>8.5)axis=vec3(1.,0.,0.);
 else if(type<2.5)axis=vec3(0.,1.,0.);
 else if(type<3.5||type>7.5)axis=vec3(0.,0.,1.);
 else rotate=false;
 if(rotate){float a=time*(.12+.10*(.5+.5*sin(seed*4.3)))*(sin(seed*6.1)<0.?-1.:1.);return p*cos(a)+cross(axis,p)*sin(a)+axis*dot(axis,p)*(1.-cos(a));}
 float margin=type<4.5?min(abs(p.x),abs(p.y)):type<5.5?min(abs(p.x),abs(p.z)):type<6.5?min(abs(p.y),abs(p.z)):abs(abs(p.x)-abs(p.y));
 float a=min(.055*r,.20*margin);vec3 phase=seed+vec3(2.1,4.2,6.3);
 vec3 q=p+a*(sin(vec3(time*.32)+phase)-sin(phase));return normalize(q)*r;
}`;
