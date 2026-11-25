// The stage tracker across the top of a deal page.
import { Check } from 'lucide-react'
import type { Stage } from '../../lib/api'
import { OPEN_STAGES, STAGE_COLOR } from './stages'

export function StageTrack({ stage }: { stage: Stage }) {
  const closed = stage === 'Won' || stage === 'Lost'
  const current = closed ? OPEN_STAGES.length : OPEN_STAGES.indexOf(stage)
  return (
    <div className="track" aria-label={`Stage: ${stage}`}>
      {OPEN_STAGES.map((s, i) => {
        const done = i < current
        const style =
          i === current
            ? { background: STAGE_COLOR[s].bg, color: STAGE_COLOR[s].fg }
            : done
              ? { background: `color-mix(in srgb, ${STAGE_COLOR[s].bg} 35%, var(--white))`, color: 'var(--midnight)' }
              : undefined
        return (
          <div key={s} className="st" style={style} aria-current={i === current ? 'step' : undefined}>
            {done && <Check size={14} />}
            {s}
          </div>
        )
      })}
      <span className="tsep" />
      {(['Won', 'Lost'] as Stage[]).map((s) => (
        <div
          key={s}
          className="st end"
          style={stage === s ? { background: STAGE_COLOR[s].bg, color: STAGE_COLOR[s].fg } : undefined}
          aria-current={stage === s ? 'step' : undefined}
        >
          {s}
        </div>
      ))}
    </div>
  )
}
