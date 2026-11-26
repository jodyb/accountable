import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, serverError } from '../../test/fakeApi'
import { pageTitle, renderApp } from '../../test/renderApp'

afterEach(() => vi.unstubAllGlobals())

const column = (stage: string) => screen.getByRole('region', { name: `${stage} column` })
const cardNames = (stage: string) =>
  within(column(stage))
    .queryAllByTestId('deal-card')
    .map((c) => c.getAttribute('data-deal'))

describe('Pipeline', () => {
  it('shows a column per stage with its cards and totals', async () => {
    fakeApi()
    renderApp('/pipeline')
    await pageTitle('Pipeline')
    expect(screen.getByTestId('board-value')).toHaveTextContent('$53,500 USD')
    expect(cardNames('Proposal')).toEqual(['Route optimisation'])
    expect(cardNames('Won')).toEqual(['Multi-site licence'])
    expect(within(column('Proposal')).getByText('Late')).toBeInTheDocument()
    expect(within(column('New')).getByText('No close date')).toBeInTheDocument()
    expect(within(column('Proposal')).getByTestId('col-count')).toHaveTextContent('1')
  })

  it('filters cards by search', async () => {
    fakeApi()
    const { user } = renderApp('/pipeline')
    await pageTitle('Pipeline')
    await user.type(screen.getByLabelText('Search deals'), 'brightline')
    expect(cardNames('Won')).toEqual(['Multi-site licence'])
    expect(cardNames('Proposal')).toEqual([])
  })

  it('adds a deal to the top of the column it was started from', async () => {
    const api = fakeApi()
    const { user } = renderApp('/pipeline')
    await pageTitle('Pipeline')
    await user.click(screen.getByRole('button', { name: 'Add deal in Qualified' }))
    expect(await screen.findByRole('combobox', { name: /^Stage/ })).toHaveValue('Qualified')
    await user.type(screen.getByLabelText(/^Deal name/), 'Fleet upgrade')
    await user.type(screen.getByLabelText(/^Value/), '900')
    await user.click(screen.getByRole('button', { name: 'Save deal' }))
    expect(await screen.findByText('Fleet upgrade added.')).toBeInTheDocument()
    expect(api.sent('POST', '/deals')).toMatchObject({ stage: 'Qualified', probability: 25 })
  })

  it('says when the board cannot load', async () => {
    fakeApi({ 'GET /pipeline': serverError() })
    renderApp('/pipeline')
    expect(await screen.findByText(/Couldn't load the pipeline/)).toBeInTheDocument()
  })
})
