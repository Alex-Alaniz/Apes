// Clear admin cache script
// Run this in browser console to clear cached admin status

console.log('🔐 Clearing admin authorization cache...');

// Clear localStorage if any admin data is stored there
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('admin') || key.includes('auth') || key.includes('wallet'))) {
    keysToRemove.push(key);
  }
}
keysToRemove.forEach(key => localStorage.removeItem(key));

// Clear sessionStorage 
const sessionKeysToRemove = [];
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  if (key && (key.includes('admin') || key.includes('auth') || key.includes('wallet'))) {
    sessionKeysToRemove.push(key);
  }
}
sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

// If the clearAdminCache function exists, call it
if (typeof window.clearAdminCache === 'function') {
  window.clearAdminCache();
  console.log('✅ Called window.clearAdminCache()');
}

console.log('✅ Admin cache cleared. Refresh the page.');
console.log('🔄 Refreshing page in 2 seconds...');

setTimeout(() => {
  window.location.reload();
}, 2000);