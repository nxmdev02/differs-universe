import * as THREE from 'three'

/** One point cloud; only 1 in 13 stars gently changes opacity over 4–8 seconds. */
export function createStarfield(color: THREE.ColorRepresentation, time: { value: number }) {
  const count = 700
  const positions = new Float32Array(count * 3)
  const twinkle = new Float32Array(count * 3)
  let seed = 137
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0
    return (seed >>> 0) / 4294967296
  }
  for (let index = 0; index < count; index++) {
    positions.set([(random() - 0.5) * 2600, (random() - 0.5) * 2200, -100], index * 3)
    twinkle.set(
      [
        index % 13 === 0 ? 0.25 : 0,
        ((index * 0.61803398875) % 1) * Math.PI * 2,
        4 + ((index * 0.754877666) % 1) * 4,
      ],
      index * 3,
    )
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('twinkle', new THREE.BufferAttribute(twinkle, 3))
  const material = new THREE.PointsMaterial({
    color,
    size: 1.2,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: false,
    depthWrite: false,
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.twinkleTime = time
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec3 twinkle; uniform float twinkleTime; varying float starBrightness;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nstarBrightness=1.+twinkle.x*sin(twinkleTime*6.28318530718/twinkle.z+twinkle.y);',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float starBrightness;')
      .replace(
        '#include <opaque_fragment>',
        'diffuseColor.a*=starBrightness;\n#include <opaque_fragment>',
      )
  }
  material.customProgramCacheKey = () => 'subtle-star-twinkle-v1'
  return new THREE.Points(geometry, material)
}
