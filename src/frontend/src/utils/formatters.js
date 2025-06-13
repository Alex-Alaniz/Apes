// Utility functions for formatting display values

/**
 * Format large numbers with K, M, B suffixes
 * @param {number} num - The number to format
 * @returns {string} Formatted string (e.g., "1.2K", "3.5M")
 */
export const formatCompactNumber = (num) => {
  if (!num || num === 0) return '0';
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  } else if (absNum >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  } else if (absNum >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  
  return num.toLocaleString();
};

/**
 * Format SOL amount with proper decimals
 * @param {number} amount - The SOL amount
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted SOL amount
 */
export const formatSOL = (amount, decimals = 2) => {
  if (!amount || amount === 0) return '0 SOL';
  
  return `${parseFloat(amount).toFixed(decimals)} SOL`;
};

/**
 * Format APES token amount
 * @param {number} amount - The APES amount
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted APES amount
 */
export const formatAPES = (amount, decimals = 2) => {
  if (!amount || amount === 0) return '0 APES';
  
  return `${parseFloat(amount).toFixed(decimals)} APES`;
};

/**
 * Format date to readable string
 * @param {string|Date} date - The date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format date and time
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '';
  }
};

/**
 * Format percentage
 * @param {number} value - The percentage value (0-100)
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0%';
  
  return `${parseFloat(value).toFixed(decimals)}%`;
};

/**
 * Format wallet address with ellipsis
 * @param {string} address - The wallet address
 * @param {number} chars - Number of characters to show at start and end (default: 4)
 * @returns {string} Formatted address (e.g., "APEx...j4z")
 */
export const formatAddress = (address, chars = 4) => {
  if (!address) return '';
  
  if (address.length <= chars * 2) return address;
  
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

/**
 * Format time remaining
 * @param {Date|string} endTime - The end time
 * @returns {string} Formatted time remaining (e.g., "2d 14h", "3h 25m")
 */
export const formatTimeRemaining = (endTime) => {
  if (!endTime) return '';
  
  try {
    const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  } catch (error) {
    console.error('Error formatting time remaining:', error);
    return '';
  }
}; 