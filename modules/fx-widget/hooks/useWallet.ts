'use client'

import { useState, useEffect, useCallback } from 'react'

// Wallet types
export interface WalletInfo {
  address: string
  chainId: number
  chainName: string
  balance: string
  connected: boolean
  walletName: string
}

export interface UseWalletReturn {
  wallet: WalletInfo | null
  isConnecting: boolean
  isConnected: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  availableWallets: string[]
}

// Chain names mapping
const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  56: 'BNB Chain',
  137: 'Polygon',
  43114: 'Avalanche',
  42161: 'Arbitrum',
  10: 'Optimism',
  8453: 'Base',
  324: 'zkSync Era',
}

// Helper function to get the best available provider
function getProvider() {
  if (typeof window === 'undefined') return null
  
  const ethereum = (window as any).ethereum
  if (!ethereum) return null
  
  // If ethereum.providers exists (multiple wallets), try to find MetaMask
  if (ethereum.providers?.length) {
    const metaMaskProvider = ethereum.providers.find((p: any) => p.isMetaMask && !p.isBraveWallet)
    if (metaMaskProvider) return metaMaskProvider
    return ethereum.providers[0]
  }
  
  return ethereum
}

export function useWallet(): UseWalletReturn {
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableWallets, setAvailableWallets] = useState<string[]>([])

  // Update wallet info helper
  const updateWalletInfo = useCallback(async (address: string) => {
    try {
      const provider = getProvider()
      if (!provider) return

      // Get chain ID
      const chainIdHex = await provider.request({ method: 'eth_chainId' })
      const chainId = parseInt(chainIdHex, 16)

      // Get balance
      const balanceHex = await provider.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      })
      const balanceWei = parseInt(balanceHex, 16)
      const balanceEth = (balanceWei / 1e18).toFixed(4)

      // Determine wallet name
      let walletName = 'Browser Wallet'
      if (provider.isMetaMask && !provider.isBraveWallet) walletName = 'MetaMask'
      else if (provider.isCoinbaseWallet) walletName = 'Coinbase'
      else if (provider.isTrust) walletName = 'Trust Wallet'
      else if (provider.isBraveWallet) walletName = 'Brave Wallet'
      else if (provider.isPhantom) walletName = 'Phantom'

      setWallet({
        address,
        chainId,
        chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
        balance: balanceEth,
        connected: true,
        walletName,
      })
    } catch (err) {
      console.error('Failed to update wallet info:', err)
    }
  }, [])

  // Check for available wallets on mount
  useEffect(() => {
    const checkWallets = async () => {
      const wallets: string[] = []
      
      if (typeof window !== 'undefined') {
        // Check for various wallet providers
        if ((window as any).ethereum) {
          if ((window as any).ethereum.isMetaMask) wallets.push('MetaMask')
          if ((window as any).ethereum.isCoinbaseWallet) wallets.push('Coinbase')
          if ((window as any).ethereum.isTrust) wallets.push('Trust Wallet')
          if ((window as any).ethereum.isBraveWallet) wallets.push('Brave Wallet')
          if (wallets.length === 0) wallets.push('Browser Wallet')
        }
        if ((window as any).phantom?.solana) wallets.push('Phantom')
        if ((window as any).solflare) wallets.push('Solflare')
      }
      
      setAvailableWallets(wallets)
    }
    
    checkWallets()
  }, [])

  // Listen for account and chain changes
  useEffect(() => {
    const provider = getProvider()
    if (!provider) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        setWallet(null)
      } else if (wallet) {
        // Account changed
        updateWalletInfo(accounts[0])
      }
    }

    const handleChainChanged = () => {
      // Chain changed, refresh wallet info
      if (wallet) {
        updateWalletInfo(wallet.address)
      }
    }

    try {
      provider.on('accountsChanged', handleAccountsChanged)
      provider.on('chainChanged', handleChainChanged)
    } catch (err) {
      // Some wallets don't support event listeners
      console.warn('Could not add wallet event listeners:', err)
    }

    return () => {
      try {
        provider.removeListener('accountsChanged', handleAccountsChanged)
        provider.removeListener('chainChanged', handleChainChanged)
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [wallet, updateWalletInfo])

  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)

    try {
      if (typeof window === 'undefined') {
        throw new Error('Window is not available')
      }

      const provider = getProvider()
      if (!provider) {
        throw new Error('No Web3 wallet detected. Please install MetaMask or another Web3 wallet.')
      }

      // Request account access with timeout
      const accountsPromise = provider.request({
        method: 'eth_requestAccounts',
      })

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout. Please try again.')), 30000)
      })

      const accounts = await Promise.race([accountsPromise, timeoutPromise]) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.')
      }

      await updateWalletInfo(accounts[0])
    } catch (err: any) {
      // Handle common error cases
      let errorMessage = 'Failed to connect wallet'
      
      if (err.code === 4001) {
        errorMessage = 'Connection rejected. Please approve the connection in your wallet.'
      } else if (err.code === -32002) {
        errorMessage = 'Connection request pending. Please check your wallet.'
      } else if (err.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please try again.'
      } else if (err.message?.includes('Unexpected error')) {
        errorMessage = 'Wallet extension conflict. Try disabling other wallet extensions or refresh the page.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      console.error('Wallet connection error:', err)
    } finally {
      setIsConnecting(false)
    }
  }, [updateWalletInfo])

  const disconnect = useCallback(() => {
    setWallet(null)
    setError(null)
  }, [])

  return {
    wallet,
    isConnecting,
    isConnected: wallet?.connected ?? false,
    error,
    connect,
    disconnect,
    availableWallets,
  }
}
