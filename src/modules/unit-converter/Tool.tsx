import { useMemo, useState } from 'react'

const lengthFactors = {
  m: 1,
  km: 1000,
  mi: 1609.344,
  ft: 0.3048,
} as const

type LengthUnit = keyof typeof lengthFactors
type TempUnit = 'C' | 'F' | 'K'

function convertLength(value: number, from: LengthUnit, to: LengthUnit) {
  return (value * lengthFactors[from]) / lengthFactors[to]
}

function convertTemperature(value: number, from: TempUnit, to: TempUnit) {
  const c = from === 'C' ? value : from === 'F' ? ((value - 32) * 5) / 9 : value - 273.15
  if (to === 'C') return c
  if (to === 'F') return (c * 9) / 5 + 32
  return c + 273.15
}

export default function UnitConverterTool() {
  const [lengthValue, setLengthValue] = useState('1')
  const [lengthFrom, setLengthFrom] = useState<LengthUnit>('m')
  const [lengthTo, setLengthTo] = useState<LengthUnit>('km')

  const [tempValue, setTempValue] = useState('25')
  const [tempFrom, setTempFrom] = useState<TempUnit>('C')
  const [tempTo, setTempTo] = useState<TempUnit>('F')

  const lengthResult = useMemo(() => {
    const n = Number(lengthValue)
    return Number.isFinite(n) ? convertLength(n, lengthFrom, lengthTo).toFixed(4) : '—'
  }, [lengthValue, lengthFrom, lengthTo])

  const tempResult = useMemo(() => {
    const n = Number(tempValue)
    return Number.isFinite(n) ? convertTemperature(n, tempFrom, tempTo).toFixed(2) : '—'
  }, [tempValue, tempFrom, tempTo])

  return (
    <div className="toolPage">
      <h2>Unit Converter</h2>
      <div className="row">
        <input value={lengthValue} onChange={(e) => setLengthValue(e.target.value)} />
        <select value={lengthFrom} onChange={(e) => setLengthFrom(e.target.value as LengthUnit)}>
          <option value="m">m</option>
          <option value="km">km</option>
          <option value="mi">mi</option>
          <option value="ft">ft</option>
        </select>
        <span>→</span>
        <select value={lengthTo} onChange={(e) => setLengthTo(e.target.value as LengthUnit)}>
          <option value="m">m</option>
          <option value="km">km</option>
          <option value="mi">mi</option>
          <option value="ft">ft</option>
        </select>
      </div>
      <p className="result">Length result: {lengthResult}</p>

      <div className="row">
        <input value={tempValue} onChange={(e) => setTempValue(e.target.value)} />
        <select value={tempFrom} onChange={(e) => setTempFrom(e.target.value as TempUnit)}>
          <option value="C">°C</option>
          <option value="F">°F</option>
          <option value="K">K</option>
        </select>
        <span>→</span>
        <select value={tempTo} onChange={(e) => setTempTo(e.target.value as TempUnit)}>
          <option value="C">°C</option>
          <option value="F">°F</option>
          <option value="K">K</option>
        </select>
      </div>
      <p className="result">Temperature result: {tempResult}</p>
    </div>
  )
}
