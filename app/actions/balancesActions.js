// @flow
import { api } from 'neon-js'
import { extend, isEmpty, unionBy } from 'lodash-es'
import { createActions } from 'spunky'
import { Howl, Howler } from 'howler'
// eslint-disable-next-line $FlowFixMe
import coinAudioSample from '../assets/audio/coin.wav'

import { getNode } from './nodeStorageActions'
import { ASSETS } from '../core/constants'
import { COIN_DECIMAL_LENGTH } from '../core/formatters'

const MAX_SCRIPT_HASH_CHUNK_SIZE = 5

type Props = {
  net: string,
  address: string,
  tokens: Array<TokenItemType>
}

const inMemoryBalances = {}
let hasTriggeredAudio = false
const sound = new Howl({
  src: [coinAudioSample]
})

export const ID = 'balances'

function determineIfBalanceUpdated(balanceData: Object) {
  if (isEmpty(inMemoryBalances) || hasTriggeredAudio) {
    return undefined
  }
  Object.keys(balanceData).forEach(key => {
    // TODO: refactor to use common util functions from math.js
    if (Number(balanceData[key]) > Number(inMemoryBalances[key])) {
      sound.play()
      hasTriggeredAudio = true
    }
  })
}

function resetAudioTrigger() {
  hasTriggeredAudio = false
}

async function getBalances({ net, address, tokens }: Props) {
  let endpoint = await getNode(net)
  if (isEmpty(endpoint)) {
    endpoint = await api.getRPCEndpointFrom({ net }, api.neoscan)
  }

  const chunks = tokens
    .filter(token => !token.isUserGenerated)
    .reduce((accum, currVal) => {
      if (!accum.length) {
        accum.push([currVal.scriptHash])
        return accum
      }

      if (accum[accum.length - 1].length < MAX_SCRIPT_HASH_CHUNK_SIZE) {
        accum[accum.length - 1].push(currVal.scriptHash)
      } else {
        accum.push([currVal.scriptHash])
      }
      return accum
    }, [])

  const promiseMap = chunks.map(chunk =>
    api.nep5.getTokenBalances(endpoint, chunk, address)
  )
  const results = await Promise.all(promiseMap)

  const parsedTokenBalances = results.reduce((accum, currBalance) => {
    Object.keys(currBalance).forEach(key => {
      const foundToken = tokens.find(token => token.symbol === key)
      if (foundToken && currBalance[key]) {
        // $FlowFixMe
        determineIfBalanceUpdated({ [foundToken.symbol]: currBalance[key] })
        // $FlowFixMe
        inMemoryBalances[foundToken.symbol] = currBalance[key]
        accum.push({
          [foundToken.scriptHash]: {
            ...foundToken,
            balance: currBalance[key]
          }
        })
      }
    })
    return accum
  }, [])

  // Handle manually added script hashses here
  const userGeneratedTokenInfo = []
  // eslint-disable-next-line
  for (const token of tokens.filter(token => token.isUserGenerated)) {
    // eslint-disable-next-line
    const info = await api.nep5
      .getToken(endpoint, token.scriptHash, address)
      .catch(error => {
        // eslint-disable-next-line
        console.error(
          'An error occurrred attempting to fetch custom script hash balance info.',
          { error }
        )
        return Promise.resolve()
      })
    if (info) {
      userGeneratedTokenInfo.push({
        scriptHash: token.scriptHash,
        ...info
      })
    }
  }
  userGeneratedTokenInfo.forEach(token => {
    determineIfBalanceUpdated({ [token.symbol]: token.balance })
    inMemoryBalances[token.symbol] = token.balance
    parsedTokenBalances.push({
      [token.scriptHash]: {
        ...token
      }
    })
  })

  // asset balances
  const assetBalances = await api.getBalanceFrom({ net, address }, api.neoscan)

  const { assets } = assetBalances.balance
  // The API doesn't always return NEO or GAS keys if, for example, the address only has one asset
  const neoBalance = assets.NEO ? assets.NEO.balance.toString() : '0'
  const gasBalance = assets.GAS
    ? assets.GAS.balance.round(COIN_DECIMAL_LENGTH).toString()
    : '0'
  const parsedAssets = [
    { [ASSETS.NEO]: neoBalance },
    { [ASSETS.GAS]: gasBalance }
  ]
  determineIfBalanceUpdated({ [ASSETS.NEO]: neoBalance })
  inMemoryBalances[ASSETS.NEO] = neoBalance
  determineIfBalanceUpdated({ [ASSETS.GAS]: gasBalance })
  inMemoryBalances[ASSETS.GAS] = gasBalance

  resetAudioTrigger()
  // $FlowFixMe
  return extend({}, ...parsedTokenBalances, ...parsedAssets)
}

export default createActions(
  ID,
  ({ net, address, tokens }: Props = {}) => async () =>
    getBalances({ net, address, tokens })
)
