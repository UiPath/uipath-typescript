$ErrorActionPreference = "Stop"
git init
git branch -M main
git remote remove origin 2>$null
git remote remove upstream 2>$null
git remote add origin https://github.com/JReames/uipath-typescript.git
git remote add upstream https://github.com/UiPath/uipath-typescript.git
git fetch upstream
git reset --mixed upstream/main
git remote -v
git status
