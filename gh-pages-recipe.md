# GitHub Pages Deployment Recipe

This recipe outlines the steps to manually deploy a preview version of the Karaoke Composer app to GitHub Pages.

## Steps

1. Navigate to a safe directory and create a temporary folder:
   ```bash
   cd /path/to/safe/place && mkdir temp && cd temp
   ```

2. Clone the repository into a new directory for the preview:
   ```bash
   git clone git@github.com:ancientwizard/Karaoke-Composer.git preview-gh-pages
   ```

3. Navigate into the cloned repository:
   ```bash
   cd preview-gh-pages/
   ```

4. Create a new orphan branch for the deployment:
   ```bash
   git checkout --orphan gh-pages/v0.0.1
   ```

5. Remove all files except the `.git` directory:
   ```bash
   rm -rf *
   ```

6. Optionally, remove unnecessary configuration files:
   ```bash
   rm .eslintrc.cjs .gitignore .prettier*
   ```

7. Copy the build output (`dist/`) from the original repository:
   ```bash
   cp -r ../../Karaoke-Composer/dist/* .
   ```

8. Stage and commit the changes:
   ```bash
   git add .
   git status
   git commit -m "Deploy v0.0.1 to GitHub Pages"
   ```

9. Push the changes to the remote repository:
   ```bash
   git push --set-upstream origin gh-pages/v0.0.1
   ```

10. Clean up by removing the temporary directory:
    ```bash
    cd .. && rm -rf preview-gh-pages
    ```

---

## Notes

- Replace `/path/to/safe/place` with a directory where you want to create the temporary folder.
- Update the branch name (`gh-pages/v0.0.1`) and commit message as needed for future deployments.
- Ensure the `dist/` directory contains the latest build output before running these steps.

