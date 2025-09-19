import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { QRCodeSVG } from 'qrcode.react';

const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', icon: '🔷' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', icon: '🟣' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', icon: '🔵' },
];

const DepositModal = ({ isOpen, onClose }) => {
  const { publicKey } = useWallet();
  const [selectedChain, setSelectedChain] = useState(137); // Default to Polygon
  const [depositAddress, setDepositAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [balances, setBalances] = useState([]);
  const [showBridge, setShowBridge] = useState(false);
  const [bridgeQuote, setBridgeQuote] = useState(null);

  // Generate deposit address when chain changes
  useEffect(() => {
    if (isOpen && publicKey) {
      generateDepositAddress();
    }
  }, [isOpen, selectedChain, publicKey]);

  // Fetch user balances
  useEffect(() => {
    if (isOpen && publicKey) {
      fetchBalances();
    }
  }, [isOpen, publicKey]);

  const generateDepositAddress = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/deposits/address/${selectedChain}`, {
        headers: {
          'x-wallet-address': publicKey.toString()
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Deposit API error:', response.status, errorData);
        throw new Error(`Failed to generate deposit address: ${response.status}`);
      }
      
      const data = await response.json();
      setDepositAddress(data.address);
    } catch (err) {
      setError(err.message || 'Failed to generate deposit address');
      console.error('Deposit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/deposits/balances`, {
        headers: {
          'x-wallet-address': publicKey.toString()
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBalances(data.balances || []);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBridgeQuote = async (fromChain, toChain, token, amount) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        fromChain,
        toChain,
        token,
        amount
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/deposits/quote?${params}`, {
        headers: {
          'x-wallet-address': publicKey.toString()
        }
      });

      if (!response.ok) throw new Error('Failed to get quote');
      
      const data = await response.json();
      setBridgeQuote(data.quote);
      setShowBridge(true);
    } catch (err) {
      setError('Failed to get bridge quote');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Deposit Funds</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Chain Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Chain
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SUPPORTED_CHAINS.map(chain => (
              <button
                key={chain.id}
                onClick={() => setSelectedChain(chain.id)}
                className={`p-3 rounded-lg border transition-colors ${
                  selectedChain === chain.id
                    ? 'border-purple-500 bg-purple-900/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-2xl mb-1">{chain.icon}</div>
                <div className="text-sm text-white">{chain.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Deposit Address */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          </div>
        ) : depositAddress ? (
          <div className="space-y-4">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG
                value={depositAddress}
                size={200}
                className="mx-auto"
                level="H"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Deposit Address
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={depositAddress}
                  readOnly
                  className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3">
              <p className="text-yellow-200 text-sm">
                ⚠️ Only send USDC to this address on {SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name}.
                Sending other tokens may result in loss of funds.
              </p>
            </div>
          </div>
        ) : null}

        {/* User Balances */}
        {balances.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Your Balances</h3>
            <div className="space-y-2">
              {balances.map((balance, idx) => (
                <div key={idx} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-white">{balance.token}</div>
                      <div className="text-sm text-gray-400">
                        Total: {balance.totalBalance.toFixed(2)}
                      </div>
                    </div>
                    {Object.keys(balance.chains).length > 1 && (
                      <button
                        onClick={() => {
                          const [fromChain] = Object.keys(balance.chains);
                          getBridgeQuote(fromChain, 137, balance.token, balance.totalBalance);
                        }}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        Bridge →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bridge Quote Modal */}
        {showBridge && bridgeQuote && (
          <div className="absolute inset-0 bg-gray-900 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Bridge Quote</h3>
            <div className="space-y-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-sm text-gray-400">Protocol</div>
                <div className="text-white">{bridgeQuote.protocol.toUpperCase()}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-sm text-gray-400">Estimated Time</div>
                <div className="text-white">{bridgeQuote.estimatedTime}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-sm text-gray-400">Total Cost</div>
                <div className="text-white">${bridgeQuote.totalCostUSD || '0.00'}</div>
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowBridge(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg"
                disabled
              >
                Coming Soon
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-900/20 border border-red-600 rounded-lg p-3">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepositModal;