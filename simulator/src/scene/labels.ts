import * as THREE from 'three'

const cache = new Map<string, THREE.CanvasTexture>()

export function labelTexture(text: string, sub = '', color = '#aab4c0'): THREE.CanvasTexture {
  const key = `${text}|${sub}|${color}`
  const cached = cache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = sub ? 160 : 96
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const fit = (label: string, startPx: number, weight: string): string => {
    let size = startPx
    for (;;) {
      const font = `${weight} ${size}px ui-monospace, Menlo, monospace`
      ctx.font = font
      if (ctx.measureText(label).width <= canvas.width - 40 || size <= 18) return font
      size -= 4
    }
  }
  ctx.fillStyle = color
  ctx.font = fit(text, 56, '600')
  ctx.fillText(text, canvas.width / 2, sub ? 48 : canvas.height / 2)
  if (sub) {
    ctx.fillStyle = '#7d8894'
    ctx.font = fit(sub, 34, '400')
    ctx.fillText(sub, canvas.width / 2, 116)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 4
  cache.set(key, texture)
  return texture
}
