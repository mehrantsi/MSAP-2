import { LedColor } from '../core/modules'

const LED_COLORS: Record<LedColor, string> = {
  red: '#ff2a1f',
  yellow: '#ffae00',
  green: '#2ee858',
  blue: '#3d86ff',
}

const OFF_COLORS: Record<LedColor, string> = {
  red: '#2a0f0d',
  yellow: '#2a230d',
  green: '#0d2413',
  blue: '#0d1626',
}

interface LedBarProps {
  count: number
  value: number
  color: LedColor
  spacing?: number
  brightness?: number
}

export function LedBar({ count, value, color, spacing = 0.085, brightness = 1 }: LedBarProps) {
  const leds = []
  for (let i = 0; i < count; i++) {
    const bit = (value >> (count - 1 - i)) & 1
    leds.push(
      <mesh key={i} position={[(i - (count - 1) / 2) * spacing, 0.045, 0]}>
        <boxGeometry args={[0.055, 0.05, 0.055]} />
        <meshStandardMaterial
          color={bit ? LED_COLORS[color] : OFF_COLORS[color]}
          emissive={LED_COLORS[color]}
          emissiveIntensity={bit ? 3.2 * brightness : 0}
          roughness={0.35}
        />
      </mesh>,
    )
  }
  return <group>{leds}</group>
}
