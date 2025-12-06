'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, LogOut, ChevronDown, Copy, ExternalLink, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { WalletInfo } from '../hooks/useWallet'
import { ITEM_VARIANTS } from '../constants'

interface WalletConnectProps {
  labelClass: string
  mutedClass: string
  onAddressChange?: (address: string) => void
  // Controlled wallet state from parent
  wallet: WalletInfo | null
  isConnecting: boolean
  isConnected: boolean
  error: string | null
  onConnect: () => Promise<void>
  onDisconnect: () => void
}

export function WalletConnect({ 
  labelClass, 
  mutedClass, 
  onAddressChange,
  wallet,
  isConnecting,
  isConnected,
  error,
  onConnect,
  onDisconnect,
}: WalletConnectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleConnect = async () => {
    await onConnect()
  }

  const handleDisconnect = () => {
    onDisconnect()
    setIsDropdownOpen(false)
  }

  const handleCopyAddress = async () => {
    if (wallet?.address) {
      await navigator.clipboard.writeText(wallet.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleUseAddress = () => {
    if (wallet?.address && onAddressChange) {
      onAddressChange(wallet.address)
      setIsDropdownOpen(false)
    }
  }

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <motion.div className="mb-4" variants={ITEM_VARIANTS}>
      <label className={cn('block text-sm font-medium mb-2 transition-colors duration-300', labelClass)}>
        Wallet Connection
      </label>

      {!isConnected ? (
        // Connect Button
        <motion.button
          onClick={handleConnect}
          disabled={isConnecting}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all duration-300',
            'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700',
            'hover:bg-[#FFC828] hover:border-[#FFC828] hover:text-black',
            isConnecting && 'opacity-70 cursor-wait'
          )}
          whileHover={!isConnecting ? { scale: 1.02 } : {}}
          whileTap={!isConnecting ? { scale: 0.98 } : {}}
        >
          {isConnecting ? (
            <>
              <motion.span
                className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              <span>Connect Wallet</span>
            </>
          )}
        </motion.button>
      ) : (
        // Connected State with Dropdown
        <div className="relative">
          <motion.button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-300',
              'border-green-500 bg-green-50 dark:bg-green-900/20',
              'hover:bg-green-100 dark:hover:bg-green-900/30'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFC828] to-orange-500 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{shortenAddress(wallet!.address)}</p>
                <p className={cn('text-xs', mutedClass)}>
                  {wallet!.chainName} • {wallet!.balance} ETH
                </p>
              </div>
            </div>
            <ChevronDown className={cn('w-5 h-5 transition-transform', isDropdownOpen && 'rotate-180')} />
          </motion.button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'absolute top-full left-0 right-0 mt-2 p-2 rounded-lg border shadow-lg z-10',
                  'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                )}
              >
                {/* Wallet Info */}
                <div className="px-3 py-2 mb-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <p className={cn('text-xs mb-1', mutedClass)}>Connected with {wallet!.walletName}</p>
                  <p className="font-mono text-xs break-all">{wallet!.address}</p>
                </div>

                {/* Use as Withdrawal Address */}
                {onAddressChange && (
                  <button
                    onClick={handleUseAddress}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm">Use as Withdrawal Address</span>
                  </button>
                )}

                {/* Copy Address */}
                <button
                  onClick={handleCopyAddress}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-500">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm">Copy Address</span>
                    </>
                  )}
                </button>

                {/* Disconnect */}
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Disconnect</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs text-red-500"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  )
}

