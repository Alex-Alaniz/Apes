import React from 'react';

// Debug component to help identify object rendering issues
export class ObjectRenderingDebugger extends React.Component {
  componentDidCatch(error, errorInfo) {
    if (error.message?.includes('Objects are not valid as a React child')) {
      console.error('=== OBJECT RENDERING ERROR DETECTED ===');
      console.error('Error:', error.message);
      console.error('Component Stack:', errorInfo.componentStack);
      
      // Try to extract the object that caused the error
      const match = error.message.match(/\(found: object with keys {(.+?)}\)/);
      if (match) {
        console.error('Object keys that caused the error:', match[1]);
      }
      
      console.error('=== END ERROR DETAILS ===');
    }
  }
  
  render() {
    return this.props.children;
  }
}

// Hook to debug object rendering in functional components
export function useDebugObjectRendering(componentName, props) {
  React.useEffect(() => {
    // Check for objects that might be rendered
    Object.entries(props).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !React.isValidElement(value) && !Array.isArray(value)) {
        // Check if it has an address key
        if ('address' in value) {
          console.warn(`${componentName}: Prop "${key}" contains an object with 'address' key. This might cause rendering errors if rendered directly.`, value);
        }
      }
    });
  }, [componentName, props]);
}

export default ObjectRenderingDebugger;