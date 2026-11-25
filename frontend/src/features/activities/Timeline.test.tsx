import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StageChangeText } from './Timeline'

describe('StageChangeText', () => {
  it('bolds the two stage names', () => {
    const { container } = render(<StageChangeText text="Moved from Proposal to Negotiation" />)
    expect(container.textContent).toBe('Moved from Proposal to Negotiation')
    expect([...container.querySelectorAll('b')].map((b) => b.textContent)).toEqual(['Proposal', 'Negotiation'])
  })

  it('shows other text as it is', () => {
    const { container } = render(<StageChangeText text="Something else" />)
    expect(container.textContent).toBe('Something else')
    expect(container.querySelector('b')).toBeNull()
  })
})
