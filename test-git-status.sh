#!/bin/bash
cd /Users/alexalaniz/Documents/GitHub/apes
echo "Current directory: $(pwd)"
echo "Git version: $(git version 2>&1)"
echo "Git status:"
git status 2>&1
echo "Git remote:"
git remote -v 2>&1
echo "Git config:"
git config --list 2>&1 | grep -E "user|remote" | head -10