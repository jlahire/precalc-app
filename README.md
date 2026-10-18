# Precalc Prep

A single-page precalculus study guide: lessons with on-paper worked steps, cheat sheets, a glossary and index, quizzes and tests with answer keys, and a practice-sheet generator.

## Files

| File | What it is |
| --- | --- |
| `precalc-prep.html` | The whole study guide (everything is inside this one file) |
| `index.html` | Sends the site's home address to `precalc-prep.html` |
| `manifest.webmanifest`, `icons/` | Name and icon for "Add to Home Screen" |
| `sw.js` | Keeps an offline copy after the first visit (only on the website, not when opened as a file) |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## Publish with GitHub Pages

1. On github.com, create a new **public** repository (for example `precalc-prep`).
2. Push all the files in this folder to the `main` branch, keeping the folder layout (`icons/` included).
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**, **Branch** to `main` and the folder to `/ (root)`, then **Save**.
5. Wait a minute or two. The address appears at the top of the Pages settings:
   `https://<your-username>.github.io/<repository-name>/`

## Use it on each device

- **iPad / iPhone:** open the address in Safari, tap **Share → Add to Home Screen**. It opens full screen like an app and works offline after the first visit.
- **Laptop:** open the address and bookmark it (Chrome and Edge also offer an install button in the address bar).

## Updating

Edit `precalc-prep.html`, commit and push. GitHub Pages republishes in about a minute. Devices pick up the new version the next time they open it online.

Settings and checklist ticks are saved separately on each device and browser.
