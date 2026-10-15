import * as THREE from 'three';
import type { Painting } from '../types';

export function waterMaterial(painting: Painting): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uNight: { value: 0 },
      uColor: { value: new THREE.Color(painting.palette.water) },
      uSky: { value: new THREE.Color(painting.palette.sky) },
    },
    vertexShader: `varying vec3 vWorld; varying float vDepth; void main(){ vec4 w = modelMatrix * vec4(position,1.); vWorld=w.xyz; vec4 mv=viewMatrix*w; vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime; uniform float uNight; uniform vec3 uColor; uniform vec3 uSky; varying vec3 vWorld; varying float vDepth;
      void main(){ vec2 p=vWorld.xz;
      float wave=sin(p.x*.8+p.y*2.3+uTime*.42+sin(p.x*.21+p.y*.18)*3.);
      float streak=pow(max(0.,wave),24.)*.075;
      float detail=sin(p.x*3.1+p.y*.4+uTime*.2)*.008;
      vec3 c=uColor*(.91+sin(p.x*.036+p.y*.054)*.055)+streak+detail;
      c=mix(c,uSky,smoothstep(85.,300.,vDepth)*.75);
      c=mix(c,vec3(.006,.016,.03)+streak*vec3(.3,.45,.6),uNight*.94);
      float moonPath=exp(-pow((p.x-40.+sin(p.y*.18)*4.)/12.,2.))*smoothstep(-50.,20.,p.y)*smoothstep(180.,25.,p.y);
      c+=vec3(.29,.36,.35)*moonPath*pow(max(0.,wave),7.)*uNight*.23;
      gl_FragColor=vec4(c,1.);\n #include <tonemapping_fragment> \n #include <colorspace_fragment> }`,
  });
}
export function createStarrySky(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vPosition; uniform float uTime;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){vec3 d=normalize(vPosition); vec2 p=vec2(atan(d.x,-d.z),asin(d.y));
      vec2 c=(p-vec2(-.36,.13))*vec2(.65,1.7); float r=length(c); float a=atan(c.y,c.x); float flow=sin(a*2.+r*64.-uTime*.045+sin(p.x*14.)*.35);
      float brush=sin(p.x*390.+sin(p.y*180.)*5.+flow*3.)*sin(p.y*290.+p.x*60.);
      vec3 color=mix(vec3(.009,.022,.08),vec3(.06,.16,.32),smoothstep(-.7,1.,flow)*.75+brush*.12);
      float spiral=exp(-r*5.)*pow(max(0.,flow),4.);color+=vec3(.15,.24,.28)*spiral;
      for(int i=0;i<14;i++){float f=float(i);vec2 star=vec2(-1.25+f*.14,.10+sin(f*7.23)*.13);vec2 q=p-star;float dist=length(q);float halo=exp(-dist*95.);float ring=(.5+.5*sin(dist*950.-uTime*.12))*exp(-dist*60.)*.2;color+=vec3(.95,.72,.25)*(halo+ring);}
      vec2 moon=p-vec2(.03,.24);float md=length(moon);float crescent=smoothstep(.042,.037,md)*(1.-smoothstep(.035,.03,length(moon-vec2(.018,.008))));color+=vec3(1.,.77,.32)*crescent;color+=vec3(.3,.21,.07)*exp(-md*24.);
      color=mix(vec3(.02,.04,.085),color,smoothstep(-.12,.02,p.y)); gl_FragColor=vec4(color,1.);\n #include <colorspace_fragment> }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 32), material);
  sky.name = 'Animated impasto sky';
  return sky;
}
export function mistMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.24 },
      uColor: { value: new THREE.Color('#e6e6d9') },
    },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform float uTime;uniform float uOpacity;uniform vec3 uColor;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
    void main(){vec2 p=vUv-.5;vec2 drift=vec2(uTime*.009,0.);
    float clouds=noise(vUv*vec2(6.,3.)+drift)*.6+noise(vUv*vec2(17.,8.)-drift)*.3+noise(vUv*32.+drift)*.1;
    float edge=exp(-p.x*p.x*11.-p.y*p.y*22.)*smoothstep(0.,.14,vUv.x)*smoothstep(1.,.86,vUv.x)*smoothstep(0.,.14,vUv.y)*smoothstep(1.,.86,vUv.y);
    gl_FragColor=vec4(uColor,edge*smoothstep(.16,.78,clouds)*uOpacity);\n #include <colorspace_fragment> }`,
  });
}
