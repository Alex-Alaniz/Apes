#!/bin/bash
echo "=== Git Diagnostic ==="
echo "1. Checking if we're in the right directory:"
pwd
echo ""
echo "2. Checking if .git directory exists:"
ls -la /Users/alexalaniz/Documents/GitHub/apes/.git 2>&1
echo ""
echo "3. Trying git commands with full paths:"
/usr/bin/git --version 2>&1
echo ""
echo "4. Checking git configuration:"
/usr/bin/git config --global user.name 2>&1
/usr/bin/git config --global user.email 2>&1
echo ""
echo "5. Attempting git status with full path:"
cd /Users/alexalaniz/Documents/GitHub/apes && /usr/bin/git status 2>&1