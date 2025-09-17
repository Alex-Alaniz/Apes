// Utility to help debug object rendering issues

// Override console.error in development to catch object rendering errors
if (process.env.NODE_ENV === 'development' || import.meta.env.DEV) {
  const originalError = console.error;
  
  console.error = function(...args) {
    // Check if this is an object rendering error
    if (args[0] && typeof args[0] === 'string' && args[0].includes('Objects are not valid as a React child')) {
      console.warn('🚨 OBJECT RENDERING ERROR DETECTED 🚨');
      
      // Try to extract helpful information
      const errorMessage = args[0];
      const match = errorMessage.match(/\(found: object with keys {(.+?)}\)/);
      
      if (match) {
        console.warn('Object keys:', match[1]);
        console.warn('This error typically occurs when:');
        console.warn('1. Rendering an object directly in JSX: {someObject}');
        console.warn('2. Using conditional rendering with objects: {condition && objectVariable}');
        console.warn('3. Missing .toString() on addresses or publicKeys');
        console.warn('');
        console.warn('Check these components:');
        console.warn('- PrivyWalletButton');
        console.warn('- Navbar');
        console.warn('- Any component using addresses from useMultiChainWallet');
        console.warn('');
        console.warn('Stack trace follows:');
      }
      
      // Log stack trace
      console.trace();
    }
    
    // Call original console.error
    originalError.apply(console, args);
  };
}

// Helper function to safely render addresses
export function safeRenderAddress(address) {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (address.toString) return address.toString();
  if (address.address) return safeRenderAddress(address.address);
  console.warn('safeRenderAddress: Unable to convert to string:', address);
  return '';
}

// Hook to validate props don't contain objects that might be rendered
export function useValidateProps(componentName, props) {
  if (process.env.NODE_ENV === 'development' || import.meta.env.DEV) {
    Object.entries(props).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Check if it looks like it might be rendered
        if (key === 'children' || key.startsWith('render')) {
          return; // These are expected to be objects/elements
        }
        
        // Warn about potential issues
        if ('address' in value) {
          console.warn(`[${componentName}] Prop "${key}" contains an object with 'address'. Ensure it's not rendered directly.`);
        }
      }
    });
  }
}

export default { safeRenderAddress, useValidateProps };