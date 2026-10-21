import * as THREE from 'three'
import land from '~/assets/earth-land.json'
import type { CelestialAppearance } from '#shared/utils/project-appearance'

const noiseShader = `
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return noise(p)*.55+noise(p*2.03)*.27+noise(p*4.07)*.12+noise(p*8.11)*.06;}
`

export function planetMaterial(
  appearance: Pick<CelestialAppearance, 'kind' | 'color' | 'accent' | 'seed'>,
) {
  const kinds = [
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'venus',
    'mars',
    'mercury',
    'pluto',
    'moon',
    'comet',
  ]
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(appearance.color) },
      accent: { value: new THREE.Color(appearance.accent) },
      seed: { value: appearance.seed / 1000 },
      kind: { value: kinds.indexOf(appearance.kind) },
      lightDirection: { value: new THREE.Vector3(-0.65, 0.65, 1).normalize() },
      trafficGlow: { value: 0 },
    },
    vertexShader: `varying vec3 vNormal; varying vec3 p;
      void main(){ vNormal=normalMatrix*normal; p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 color,accent,lightDirection; uniform float seed,trafficGlow; uniform int kind; varying vec3 vNormal,p;
      ${noiseShader}
      void main(){
        vec3 n=normalize(vNormal); float f=fbm(p*5.+seed);
        vec3 surface=color;
        if(kind==0){
          float bands=sin(p.y*31.+fbm(p*7.)*3.5);surface=mix(color*.62,accent,smoothstep(-.8,.8,bands)*.8);
          float spot=length((p.xy-vec2(.38,-.27))*vec2(5.,10.));
          surface=mix(surface,vec3(.64,.26,.13)*(1.+f*.25),(1.-smoothstep(.65,1.1,spot))*smoothstep(0.,.3,p.z));
        }
        if(kind==1){float bands=sin(p.y*44.+f*2.);surface=mix(color*.8,accent,(bands*.5+.5)*.5);}
        if(kind==2){surface=mix(color,accent,smoothstep(.4,.8,f)*.35);surface*=.93+.07*sin(p.y*16.);}
        if(kind==3){surface=color*(.8+f*.5);float streak=smoothstep(.92,.99,sin(p.y*27.+f*3.));surface=mix(surface,accent,streak*.25);}
        if(kind==4){surface=mix(color*.65,accent,fbm(p*6.+vec3(f*2.)));}
        if(kind==5){surface=mix(color*.55,color*1.2,smoothstep(.3,.65,f));surface=mix(surface,accent,smoothstep(.87,.97,abs(p.y)));}
        if(kind>=6){
          float pits=noise(p*22.+seed);float crater=smoothstep(.30,.40,pits)-smoothstep(.40,.54,pits);
          surface=color*(.58+f*.65)-color*crater*.22;
          if(kind==7){float heart=length((p.xy-vec2(.2,-.12))*vec2(2.8,3.5));surface=mix(surface,accent,(1.-smoothstep(.65,1.0,heart))*smoothstep(0.,.4,p.z));}
        }
        float light=max(dot(n,lightDirection),0.);float edge=1.-max(n.z,0.);float rim=pow(edge,4.);
        float ambient=kind==8?.025:.19;
        // Keep a thin crescent legible at the moon's small screen size.
        float diffuse=kind==8?2.2:.95;
        vec3 lit=surface*(ambient+light*diffuse)+color*rim*(kind==8?0.:.1);
        // Reuse the sphere's shading: no bloom pass, lights, or extra geometry.
        lit+=mix(accent,vec3(1.),.3)*pow(edge,2.2)*trafficGlow*1.15;
        gl_FragColor=vec4(lit,1.);
      }`,
  })
}

export function earthCloudMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader:
      'varying vec3 p,n; void main(){p=position;n=normalMatrix*normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 p,n; ${noiseShader}
      void main(){vec3 q=p*7.;q.x+=sin(p.y*8.)*.6;float density=fbm(q+fbm(q*1.7)*1.4);float cloud=smoothstep(.49,.69,density);float light=.28+.72*max(dot(normalize(n),normalize(vec3(-.65,.65,1.))),0.);gl_FragColor=vec4(vec3(.94,.97,1.)*light,cloud*.83);}`,
  })
}

export function atmosphereMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader:
      'varying vec3 n; void main(){n=normalMatrix*normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:
      'varying vec3 n; void main(){float rim=pow(1.-max(normalize(n).z,0.),4.);gl_FragColor=vec4(.20,.55,1.,rim*.65);}',
  })
}

export function earthTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')!
  context.fillStyle = '#174f84'
  context.fillRect(0, 0, 1024, 512)
  // Natural Earth 1:110m land polygons, public domain. Equirectangular UV map.
  context.fillStyle = '#86b8a0'
  context.strokeStyle = '#afd2b1'
  context.lineWidth = 1
  for (const ring of land) {
    context.beginPath()
    ring.forEach((point, index) => {
      const x = ((point[0]! + 180) / 360) * 1024
      const y = ((90 - point[1]!) / 180) * 512
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })
    context.closePath()
    context.fill()
    context.stroke()
  }
  context.strokeStyle = '#e7f6ff35'
  context.lineWidth = 6
  for (let index = 0; index < 18; index++) {
    const x = (index * 139) % 1024
    const y = 90 + ((index * 57) % 330)
    context.beginPath()
    context.ellipse(x, y, 25 + (index % 4) * 15, 4, -0.2, 0, Math.PI * 1.5)
    context.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function cometTail() {
  const positions: number[] = []
  const alphas: number[] = []
  for (let index = 0; index < 18; index++) {
    const a = index / 18,
      b = (index + 1) / 18
    for (const [t, side] of [
      [a, -1],
      [a, 0],
      [b, -1],
      [b, -1],
      [a, 0],
      [b, 0],
      [a, 0],
      [a, 1],
      [b, 0],
      [b, 0],
      [a, 1],
      [b, 1],
    ]) {
      positions.push(0.2 + t! * 4.2, side! * (0.25 + t! * 0.9) + t! * t! * 0.7, -1)
      alphas.push(side === 0 ? (1 - t!) ** 2 * 0.5 : 0)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1))
  return new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader:
        'attribute float alpha; varying float a; void main(){a=alpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying float a; void main(){gl_FragColor=vec4(.46,.72,.94,a);}',
    }),
  )
}
