// @flow
import React, { Fragment } from 'react'

import classNames from 'classnames'
import styles from './Transaction.scss'
import ClaimIcon from '../../../assets/icons/claim.svg'
import CopyToClipboard from '../../CopyToClipboard'

type Props = {
  txDate: React$Node,
  logo: React$Node,
  label: string,
  amount: string | number,
  contactTo: React$Node | string,
  to: string,
  contactToExists: boolean,
}

export default class ClaimAbstract extends React.Component<Props> {
  render = () => {
    const {
      txDate,
      logo,
      label,
      amount,
      contactTo,
      to,
      contactToExists,
    } = this.props
    return (
      <div className={classNames(styles.transactionContainer)}>
        <div className={styles.abstractContainer}>
          <div className={styles.txTypeIconContainer}>
            <div className={styles.claimIconContainer}>
              <ClaimIcon />
            </div>
          </div>
          {txDate}
          <div className={styles.txLabelContainer}>
            {logo}
            {label}
          </div>
          <div className={styles.txAmountContainer}>{amount}</div>
          <div className={styles.txToContainer}>
            <Fragment>
              <span>{contactTo}</span>
              {!contactToExists && (
                <CopyToClipboard
                  className={styles.copy}
                  text={to}
                  tooltip="Copy Public Address"
                />
              )}
            </Fragment>
          </div>
          <div className={styles.historyButtonPlaceholder} />
        </div>
      </div>
    )
  }
}
