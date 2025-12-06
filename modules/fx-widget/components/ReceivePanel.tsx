'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, ChevronDown, Wallet } from 'lucide-react'
import { QrCode } from '@ark-ui/react/qr-code'
import { cn } from '@/lib/utils'
import { ITEM_VARIANTS } from '../constants'
import type { WalletInfo } from '../hooks/useWallet'
import {
  MorphingPopover,
  MorphingPopoverTrigger,
  MorphingPopoverContent,
} from '@/components/ui/morphing-popover'

// ============================================================================
// Constants
// ============================================================================
const NETWORKS = [
  { id: 'tron', name: 'TRC20 (Tron)', symbol: 'TRX', icon: '⚡' },
  { id: 'ethereum', name: 'ERC20 (Ethereum)', symbol: 'ETH', icon: '💎' },
  { id: 'bsc', name: 'BEP20 (BSC)', symbol: 'BNB', icon: '🔶' },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC', icon: '🟣' },
]

// ============================================================================
// QR Code Component (inline)
// ============================================================================
interface QrCodeDisplayProps {
  value: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function QrCodeDisplay({ value, size = 'md', className }: QrCodeDisplayProps) {
  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64',
  }

  return (
    <QrCode.Root
      value={value}
      encoding={{ ecc: 'M' }}
      className={cn('flex items-center justify-center', className)}
    >
      <QrCode.Frame
        className={cn(
          sizeClasses[size],
          'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-lg transition-colors duration-300'
        )}
      >
        <QrCode.Pattern className="fill-gray-900 dark:fill-white transition-colors duration-300" />
      </QrCode.Frame>
    </QrCode.Root>
  )
}

// ============================================================================
// Centered Modal Dropdown Component
// ============================================================================
interface DropdownOption {
  id: string
  name: string
  icon?: string
}

interface DropdownProps {
  title: string
  options: DropdownOption[]
  selected: DropdownOption
  onSelect: (option: DropdownOption) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Dropdown({ title, options, selected, onSelect, open, onOpenChange }: DropdownProps) {
  return (
    <MorphingPopover open={open} onOpenChange={onOpenChange}>
      <MorphingPopoverTrigger
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium',
          'transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700',
          'border-gray-300 dark:border-gray-600'
        )}
      >
        {selected.name}
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </MorphingPopoverTrigger>
      <MorphingPopoverContent className="max-w-xs">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
            {title}
          </h2>
        </div>

        {/* Options List */}
        <div className="p-2">
          {options.map((option) => {
            const isSelected = selected.id === option.id
            return (
              <button
                key={option.id}
                onClick={() => {
                  onSelect(option)
                  onOpenChange(false)
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200',
                  'focus:outline-none',
                  isSelected 
                    ? 'bg-[#FFC828]/15 ring-2 ring-[#FFC828]' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {option.icon && <span className="text-xl">{option.icon}</span>}
                <span className={cn(
                  'flex-1 font-medium',
                  isSelected && 'text-[#FFC828]'
                )}>
                  {option.name}
                </span>
                {isSelected && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FFC828]">
                    <Check className="h-4 w-4 text-black" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </MorphingPopoverContent>
    </MorphingPopover>
  )
}

// ============================================================================
// Info Row Component (reusable)
// ============================================================================
interface InfoRowProps {
  label: string
  labelClass: string
  children: React.ReactNode
  showBorder?: boolean
}

function InfoRow({ label, labelClass, children, showBorder = true }: InfoRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 transition-colors duration-300',
        showBorder && 'border-b border-gray-200 dark:border-gray-700'
      )}
    >
      <span className={cn('text-sm transition-colors duration-300', labelClass)}>
        {label}
      </span>
      {children}
    </div>
  )
}

// ============================================================================
// Main ReceivePanel Component
// ============================================================================
interface ReceivePanelProps {
  borderClass: string
  breakdownBgClass: string
  labelClass: string
  mutedClass: string
  // Connected wallet from Send panel
  wallet: WalletInfo | null
}

export function ReceivePanel({
  borderClass,
  breakdownBgClass,
  labelClass,
  mutedClass,
  wallet,
}: ReceivePanelProps) {
  const [copied, setCopied] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0])
  const [networkOpen, setNetworkOpen] = useState(false)

  // Helper to shorten address for display
  const shortenAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Get the current address from connected wallet
  const currentAddress = wallet?.connected ? wallet.address : ''

  const handleCopy = async () => {
    if (!currentAddress) return
    await navigator.clipboard.writeText(currentAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      className="space-y-6"
      variants={ITEM_VARIANTS}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold transition-colors duration-300">
          Deposit USDT
        </h3>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        {currentAddress ? (
          <QrCodeDisplay value={currentAddress} size="md" />
        ) : (
          <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700">
            <div className="text-center p-4">
              <Wallet className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connect wallet on Send tab to generate QR
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Address Section */}
      <motion.div
        className={cn(
          'p-4 rounded-lg border transition-colors duration-300',
          borderClass,
          breakdownBgClass
        )}
        variants={ITEM_VARIANTS}
      >
        <p className={cn('text-sm mb-2 transition-colors duration-300', labelClass)}>
          Address
        </p>
        <div className="flex items-center gap-2">
          {currentAddress ? (
            <>
              <p className="text-sm font-bold break-all flex-1 transition-colors duration-300">
                {currentAddress}
              </p>
              <button
                onClick={handleCopy}
                className={cn(
                  'p-2 rounded-lg border transition-all duration-300',
                  'hover:bg-[#FFC828] hover:border-[#FFC828] hover:scale-105 active:scale-95',
                  'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700'
                )}
                aria-label="Copy address"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex-1">
              No wallet connected. Connect on Send tab first.
            </p>
          )}
        </div>
      </motion.div>

      {/* Info Grid */}
      <motion.div
        className={cn(
          'rounded-lg border transition-colors duration-300 overflow-hidden',
          borderClass,
          breakdownBgClass
        )}
        variants={ITEM_VARIANTS}
      >
        {/* Network Row */}
        <InfoRow label="Network" labelClass={labelClass}>
          <Dropdown
            title="Select Network"
            options={NETWORKS}
            selected={selectedNetwork}
            onSelect={(option) => setSelectedNetwork(option as typeof NETWORKS[0])}
            open={networkOpen}
            onOpenChange={setNetworkOpen}
          />
        </InfoRow>

        {/* Account Row */}
        <InfoRow label="Account" labelClass={labelClass}>
          {wallet?.connected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green-500 bg-green-50 dark:bg-green-900/20 text-sm font-medium">
              <span className="text-green-600 dark:text-green-400">🔗</span>
              <span className="text-green-700 dark:text-green-300">
                {shortenAddress(wallet.address)}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400 px-3 py-1.5">
              Not connected
            </span>
          )}
        </InfoRow>

        {/* Minimum Deposit Row */}
        <InfoRow label="Minimum deposit" labelClass={labelClass}>
          <span className="text-sm font-medium transition-colors duration-300">
            0.01 USDT
          </span>
        </InfoRow>

        {/* Arrival Time Row */}
        <InfoRow label="Arrival time" labelClass={labelClass}>
          <span className="text-sm font-medium transition-colors duration-300">
            ~ 1 minute
          </span>
        </InfoRow>

        {/* Withdrawal Available Time Row */}
        <InfoRow label="Withdrawal available time" labelClass={labelClass} showBorder={false}>
          <span className="text-sm font-medium transition-colors duration-300">
            ~ 1 minute
          </span>
        </InfoRow>
      </motion.div>

      {/* Warning Notice */}
      <motion.p
        className={cn('text-xs text-center leading-relaxed transition-colors duration-300', mutedClass)}
        variants={ITEM_VARIANTS}
      >
        Only send USDT to this address. Sending any other asset may result in permanent loss.
      </motion.p>
    </motion.div>
  )
}
