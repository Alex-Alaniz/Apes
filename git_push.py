#!/usr/bin/env python3
import subprocess
import os

# Change to the correct directory
os.chdir('/Users/alexalaniz/Documents/GitHub/apes')

# Execute git commands
try:
    # Git status
    print("=== Git Status ===")
    result = subprocess.run(['git', 'status'], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("Error:", result.stderr)
    
    # Git add
    print("\n=== Staging all changes ===")
    result = subprocess.run(['git', 'add', '-A'], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("Error:", result.stderr)
    
    # Git commit
    print("\n=== Creating commit ===")
    commit_message = """Add optional Privy wallet integration (disabled by default)

- Added Privy dependencies to frontend and backend
- Created Privy configuration and middleware  
- Made Privy completely optional via environment variables
- Frontend only uses Privy if VITE_ENABLE_PRIVY=true
- Backend gracefully handles missing Privy configuration
- No breaking changes to existing wallet authentication
- Security: Removed all hardcoded credentials

Co-Authored-By: Claude <noreply@anthropic.com>"""
    
    result = subprocess.run(['git', 'commit', '-m', commit_message], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("Error:", result.stderr)
    
    # Git push
    print("\n=== Pushing to GitHub ===")
    result = subprocess.run(['git', 'push', 'origin', 'master'], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("Error:", result.stderr)
    
    print("\n=== Done! ===")
    
except Exception as e:
    print(f"An error occurred: {e}")