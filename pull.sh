#!/bin/bash

# Stash any local changes if they exist
if [ -n "$(git status --porcelain)" ]; then
  echo "Local changes detected. Stashing changes..."
  git stash -q
fi

# Pull the latest changes from the remote repository
git pull

# Reapply stashed changes if any were stashed
if git stash list | grep -q .; then
  echo "Reapplying stashed changes..."
  git stash pop -q
fi