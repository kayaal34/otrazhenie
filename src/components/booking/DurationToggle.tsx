import { formatRub } from '../../lib/format'
import type { PricingRuleRow } from '../../lib/booking'

type DurationToggleProps = {
  rules: PricingRuleRow[]
  value: number
  onChange: (duration: number) => void
}

export function DurationToggle({ rules, value, onChange }: DurationToggleProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rules.map((rule) => {
        const isSelected = rule.duration_hours === value
        return (
          <button
            key={rule.duration_hours}
            type="button"
            onClick={() => onChange(rule.duration_hours)}
            className={`rounded-2xl border-2 p-4 text-left transition-colors ${
              isSelected
                ? 'border-blue-primary bg-surface'
                : 'border-border bg-surface hover:border-blue-primary/50'
            }`}
          >
            <p className="font-body text-sm text-blue-deep/70">{rule.label}</p>
            <p className="mt-1 font-mono text-xl font-semibold text-blue-deep">
              {formatRub(rule.price_kopecks)}
            </p>
          </button>
        )
      })}
    </div>
  )
}
