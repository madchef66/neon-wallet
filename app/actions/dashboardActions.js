// @flow
import { createBatchActions } from 'spunky'

import balancesActions from './balancesActions'
import claimsActions from './claimsActions'
import pricesActions from './pricesActions'
import priceHistoryActions from './priceHistoryActions'

export const ID = 'dashboard'

export default createBatchActions(ID, {
  balances: balancesActions,
  claims: claimsActions,
  prices: pricesActions,
  priceHistory: priceHistoryActions,
})
