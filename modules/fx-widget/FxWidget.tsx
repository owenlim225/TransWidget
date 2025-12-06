'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// Module imports
import { FX_CONFIG, CONTAINER_VARIANTS, ITEM_VARIANTS, PERCENTAGE_POINTS } from './constants'
import { useDebounce, useFxCalculation, useThemeClasses, useWallet } from './hooks'
import { findClosestPoint } from './utils/calculations'
import { CURRENCY_SYMBOLS } from './types'
import type { FxWidgetProps, ParsedQRData } from './types'

// Component imports
import {
  WidgetHeader,
  DirectionToggle,
  WalletConnect,
  WithdrawalAddressInput,
  AssetNetworkSelector,
  AmountInput,
  QRScanner,
  MerchantInfo,
  PercentageSlider,
  CurrencySelector,
  ResultDisplay,
  FeeBreakdown,
  EmptyState,
  ReceivePanel,
  ExchangeRateDisplay,
  SendConfirmation,
} from './components'
import type { Asset, BlockchainNetwork } from './components/AssetNetworkSelector'

export function FxWidget({
  initialAmount = 0,
  supportedCurrencies = ['PHP', 'THB'],
  onNetAmountChange,
}: FxWidgetProps) {
  // Theme - now returns Tailwind dark: classes
  const { bgClass, borderClass, inputBgClass, labelClass, mutedClass, breakdownBgClass } = useThemeClasses()

  // Wallet connection (shared between Send and Receive panels)
  const { wallet, isConnecting, isConnected, error: walletError, connect, disconnect } = useWallet()

  // State
  const [accountBalance, setAccountBalance] = useState(FX_CONFIG.accountBalance)
  const [withdrawalAddress, setWithdrawalAddress] = useState('')
  const [amount, setAmount] = useState(Math.max(0, initialAmount))
  const [amountInput, setAmountInput] = useState(initialAmount > 0 ? initialAmount.toFixed(2) : '')
  const [currency, setCurrency] = useState(supportedCurrencies[0])
  const [direction, setDirection] = useState<'send' | 'receive'>('send')
  const [isFocused, setIsFocused] = useState<'address' | 'amount' | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<BlockchainNetwork | null>(null)
  const [sliderValue, setSliderValue] = useState(0)
  const [parsedQRData, setParsedQRData] = useState<ParsedQRData | null>(null)

  // Derived state
  const debouncedAmount = useDebounce(amount, 300)
  const { calculation, validCurrency } = useFxCalculation({
    amount: debouncedAmount,
    currency,
    supportedCurrencies,
  })

  const symbol = CURRENCY_SYMBOLS[validCurrency] || validCurrency

  // Effects
  useEffect(() => {
    onNetAmountChange?.(calculation.netFiat)
  }, [calculation.netFiat, onNetAmountChange])

  useEffect(() => {
    if (initialAmount > 0) {
      const initialPercentage = (initialAmount / accountBalance) * 100
      setSliderValue(Math.min(100, Math.max(0, initialPercentage)))
    }
  }, [initialAmount, accountBalance])

  // Handlers
  const handleSliderChange = (values: number[]) => {
    const percentage = values[0]
    setSliderValue(percentage)
    const calculatedAmount = (accountBalance * percentage) / 100
    setAmount(calculatedAmount)
    setAmountInput(calculatedAmount.toFixed(2))
  }

  const handleSliderCommit = (values: number[]) => {
    const percentage = values[0]
    const closestPoint = findClosestPoint(percentage, PERCENTAGE_POINTS)
    if (Math.abs(percentage - closestPoint) <= 5) {
      setSliderValue(closestPoint)
      const calculatedAmount = (accountBalance * closestPoint) / 100
      setAmount(calculatedAmount)
      setAmountInput(calculatedAmount.toFixed(2))
    }
  }

  const handleSliderPointClick = (e: React.MouseEvent, percentage: number) => {
    e.preventDefault()
    e.stopPropagation()
    setSliderValue(percentage)
    const calculatedAmount = (accountBalance * percentage) / 100
    setAmount(calculatedAmount)
    setAmountInput(calculatedAmount.toFixed(2))
  }

  const handleAmountInputChange = (inputValue: string) => {
    setAmountInput(inputValue)
    const numValue = Number.parseFloat(inputValue) || 0
    const validAmount = Math.max(0, numValue)
    setAmount(validAmount)
    setSliderValue((validAmount / accountBalance) * 100)
  }

  const handleAmountBlur = () => {
    setIsFocused(null)
    if (amountInput === '' || Number.parseFloat(amountInput) === 0) {
      setAmountInput('')
      setAmount(0)
    } else {
      const numValue = Number.parseFloat(amountInput) || 0
      setAmountInput(numValue.toFixed(2))
    }
  }

  const handleMaxClick = () => {
    setAmount(accountBalance)
    setAmountInput(accountBalance.toFixed(2))
    setSliderValue(100)
  }

  const handleSendSuccess = (sentAmount: number) => {
    // Reduce account balance
    setAccountBalance((prev) => Math.max(0, prev - sentAmount))
    // Reset form
    setAmount(0)
    setAmountInput('')
    setSliderValue(0)
    setWithdrawalAddress('')
    setParsedQRData(null)
  }

  // Handle parsed QR data from EMVCo QR codes
  const handleParsedQR = (data: ParsedQRData) => {
    setParsedQRData(data)
    
    // Auto-fill currency if supported and present in QR
    if (data.transactionCurrency && supportedCurrencies.includes(data.transactionCurrency)) {
      setCurrency(data.transactionCurrency)
      
      // Auto-fill amount if transaction amount is present
      if (data.transactionAmount && data.transactionAmount > 0) {
        const rate = FX_CONFIG.customerRates[data.transactionCurrency]
        if (rate) {
          // Calculate stablecoin amount needed to cover the requested fiat amount
          // Add ~3% buffer to account for fees (ripe fee + network fee + spread)
          const baseStablecoin = data.transactionAmount / rate
          const withBuffer = baseStablecoin * 1.03 // 3% buffer for fees
          const roundedAmount = Math.ceil(withBuffer * 100) / 100 // Round up to 2 decimals
          
          // Cap at account balance
          const finalAmount = Math.min(roundedAmount, accountBalance)
          
          setAmount(finalAmount)
          setAmountInput(finalAmount.toFixed(2))
          setSliderValue((finalAmount / accountBalance) * 100)
        }
      }
    }
  }

  // Clear parsed QR data
  const handleClearParsedQR = () => {
    setParsedQRData(null)
    setWithdrawalAddress('')
  }

  return (
    <motion.div
      className={`w-full max-w-md mx-auto p-6 rounded-lg border ${borderClass} ${bgClass} transition-colors duration-500 ease-in-out`}
      role="region"
      aria-label="FX and fee transparency widget"
      variants={CONTAINER_VARIANTS}
      initial="hidden"
      animate="visible"
    >
      <WidgetHeader mutedClass={mutedClass} />

      <DirectionToggle
        direction={direction}
        onDirectionChange={setDirection}
      />

      {direction === 'send' ? (
        <motion.div
          key="send-panel"
          initial="hidden"
          animate="visible"
          variants={CONTAINER_VARIANTS}
        >
          <WalletConnect
            labelClass={labelClass}
            mutedClass={mutedClass}
            onAddressChange={setWithdrawalAddress}
            wallet={wallet}
            isConnecting={isConnecting}
            isConnected={isConnected}
            error={walletError}
            onConnect={connect}
            onDisconnect={disconnect}
          />

          <WithdrawalAddressInput
            value={withdrawalAddress}
            onChange={setWithdrawalAddress}
            isFocused={isFocused === 'address'}
            onFocus={() => setIsFocused('address')}
            onBlur={() => setIsFocused(null)}
            labelClass={labelClass}
            inputBgClass={inputBgClass}
          />

          <QRScanner
            onScanSuccess={setWithdrawalAddress}
            onParsedQR={handleParsedQR}
            labelClass={labelClass}
          />

          <MerchantInfo
            parsedQR={parsedQRData}
            borderClass={borderClass}
            breakdownBgClass={breakdownBgClass}
            labelClass={labelClass}
            mutedClass={mutedClass}
            onClear={handleClearParsedQR}
          />

          <AssetNetworkSelector
            selectedAsset={selectedAsset}
            selectedNetwork={selectedNetwork}
            onAssetChange={setSelectedAsset}
            onNetworkChange={setSelectedNetwork}
            labelClass={labelClass}
          />

          <AmountInput
            amountInput={amountInput}
            onAmountChange={handleAmountInputChange}
            onAmountBlur={handleAmountBlur}
            isFocused={isFocused === 'amount'}
            onFocus={() => setIsFocused('amount')}
            selectedAsset={selectedAsset}
            onMaxClick={handleMaxClick}
            accountBalance={accountBalance}
            labelClass={labelClass}
            inputBgClass={inputBgClass}
            mutedClass={mutedClass}
          />

          <PercentageSlider
            sliderValue={sliderValue}
            onSliderChange={handleSliderChange}
            onSliderCommit={handleSliderCommit}
            onPointClick={handleSliderPointClick}
            labelClass={labelClass}
          />

          <CurrencySelector
            currency={validCurrency}
            supportedCurrencies={supportedCurrencies}
            onCurrencyChange={setCurrency}
            labelClass={labelClass}
            inputBgClass={inputBgClass}
          />

          <ResultDisplay
            amount={amount}
            netFiat={calculation.netFiat}
            symbol={symbol}
            borderClass={borderClass}
            breakdownBgClass={breakdownBgClass}
            mutedClass={mutedClass}
          />

          {/* Real-time exchange rate */}
          {amount > 0 && selectedAsset && (
            <ExchangeRateDisplay
              stablecoin={selectedAsset.symbol.toLowerCase()}
              fiatCurrency={validCurrency}
              mutedClass={mutedClass}
            />
          )}

          <FeeBreakdown
            amount={amount}
            calculation={calculation}
            symbol={symbol}
            borderClass={borderClass}
            breakdownBgClass={breakdownBgClass}
            labelClass={labelClass}
            mutedClass={mutedClass}
          />

          {/* Send Button with Confirmation */}
          <SendConfirmation
            amount={amount}
            stablecoinSymbol={selectedAsset?.symbol || '---'}
            withdrawalAddress={withdrawalAddress}
            calculation={calculation}
            fiatSymbol={symbol}
            fiatCurrency={validCurrency}
            borderClass={borderClass}
            breakdownBgClass={breakdownBgClass}
            labelClass={labelClass}
            mutedClass={mutedClass}
            parsedQRData={parsedQRData}
            onSendSuccess={handleSendSuccess}
          />

          <EmptyState
            amount={amount}
            borderClass={borderClass}
            breakdownBgClass={breakdownBgClass}
            mutedClass={mutedClass}
          />

          {/* Footer Disclaimer */}
          <motion.p className={`text-xs ${mutedClass} mt-4 text-center leading-relaxed transition-colors duration-300`} variants={ITEM_VARIANTS}>
            Rates and fees are for demonstration. Actual rates may vary.
          </motion.p>
        </motion.div>
      ) : (
        <ReceivePanel
          borderClass={borderClass}
          breakdownBgClass={breakdownBgClass}
          labelClass={labelClass}
          mutedClass={mutedClass}
          wallet={wallet}
        />
      )}
    </motion.div>
  )
}

export default FxWidget
