# Work portfolio

Static site for GitHub Pages. No build step.

- `builds.js` — all content: categories and one object per card (see the header comment for the shape)
- `app.js` — renders sections, cards, diagrams, galleries and the lightbox
- `style.css` — theme tokens (light + dark) and layout
- `assets/shots/` — screenshots; internal tools use placeholder names, never member data

To add a build, append an object to `BUILDS` with a `cat` from `CATEGORIES`. Preview with
`python3 -m http.server` in this folder.
