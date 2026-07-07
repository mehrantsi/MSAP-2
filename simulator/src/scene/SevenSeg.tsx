const DIGIT_SEGMENTS: Record<string, number> = {
  '0': 0b0111111,
  '1': 0b0000110,
  '2': 0b1011011,
  '3': 0b1001111,
  '4': 0b1100110,
  '5': 0b1101101,
  '6': 0b1111101,
  '7': 0b0000111,
  '8': 0b1111111,
  '9': 0b1101111,
  '-': 0b1000000,
  ' ': 0,
}

const SEG_LAYOUT: { x: number; y: number; w: number; h: number }[] = [
  { x: 0, y: 0.14, w: 0.11, h: 0.03 },
  { x: 0.07, y: 0.07, w: 0.03, h: 0.11 },
  { x: 0.07, y: -0.07, w: 0.03, h: 0.11 },
  { x: 0, y: -0.14, w: 0.11, h: 0.03 },
  { x: -0.07, y: -0.07, w: 0.03, h: 0.11 },
  { x: -0.07, y: 0.07, w: 0.03, h: 0.11 },
  { x: 0, y: 0, w: 0.11, h: 0.03 },
]

function Digit({ char, position, brightness = 1 }: { char: string; position: [number, number, number]; brightness?: number }) {
  const mask = DIGIT_SEGMENTS[char] ?? 0
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      {SEG_LAYOUT.map((seg, i) => {
        const on = (mask >> i) & 1
        return (
          <mesh key={i} position={[seg.x, seg.y, 0]}>
            <boxGeometry args={[seg.w, seg.h, 0.02]} />
            <meshStandardMaterial
              color={on ? '#ff2a1f' : '#200b09'}
              emissive="#ff2a1f"
              emissiveIntensity={on ? 3 * brightness : 0}
              roughness={0.4}
            />
          </mesh>
        )
      })}
    </group>
  )
}

export function SevenSeg({
  value,
  signed,
  blank = false,
  brightness = 1,
}: {
  value: number
  signed: boolean
  blank?: boolean
  brightness?: number
}) {
  const shown = signed && value > 127 ? value - 256 : value
  const text = blank ? '    ' : String(shown).padStart(4, ' ').slice(-4)
  return (
    <group>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[1.05, 0.06, 0.45]} />
        <meshStandardMaterial color="#131313" roughness={0.5} />
      </mesh>
      {text.split('').map((char, i) => (
        <Digit key={i} char={char} position={[(i - 1.5) * 0.24, 0.085, 0]} brightness={brightness} />
      ))}
    </group>
  )
}
