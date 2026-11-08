# One Photon, Many Worlds: project page

Project website for **"One Photon, Many Worlds: Posteriors and Predictions with Single-Photon Cameras"** by Haejoon
Lee, Mohit Gupta, Vijayakumar Bhagavatula, and Aswin C. Sankaranarayanan.
arXiv preprint, 2026. Paper: <https://arxiv.org/abs/2610.02675>

It is a static site: plain HTML, CSS, and JavaScript, with no build step and no server-side code.

## Publishing

1. Copy the repository contents (everything except `.git/`) into the target web directory, for example
   `…/<project>/` on the lab server. All paths are relative, so the site works from any folder or subfolder.
2. Before going live, update the social-preview tags in the `<head>` of `index.html` (a comment marks the spot):
   add `og:url`, add an approved 1200×630 `og:image`, and make `og:image` / `twitter:image` absolute URLs.
3. Videos are H.264 `.mp4`. Most web servers already serve them correctly: `video/mp4` with range requests.
4. The media are about 35 MB. If you push this repository over HTTPS, run
   `git config --local http.postBuffer 524288000` before the first push (a large first push can fail with HTTP 400).

No analytics or tracking is included. The only third-party request is to Google Fonts.

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

## Contents

| Path | What it is |
|---|---|
| `index.html` | The page (dark theme) |
| `static/css/bulma.min.css` | Bulma CSS framework |
| `static/css/index.css` | Site styles (dark-theme colors, layout, page components) |
| `static/js/index.js` | Lazy video playback, tabs, and the photon-title animation |
| `static/js/fontawesome.all.min.js` | Icons for the link buttons |
| `public/media/videos/` | H.264 result videos (`teaser_sunglasses_8rows.mp4` is the full 8-row version the teaser opens on click) |
| `public/media/posters/` | Poster frames for the videos |
| `public/media/images/` | Figures (`*_large.png` are the click-to-enlarge versions) and real-capture digit grids |

When you edit `index.css` or `index.js`, bump the `?v=` query on their links in `index.html` so returning visitors
don't keep a cached copy.

## Credits

- arXiv preprint arXiv:2610.02675 (2026). © the authors; distributed by arXiv under the
  [arXiv non-exclusive license](http://arxiv.org/licenses/nonexclusive-distrib/1.0/).
  The figures and videos come from the paper and its authors.
- Datasets shown: FFHQ (Karras et al., 2019; images converted to grayscale and resized), QR Code Dataset V2
  (yasin sancar, 2025; CC BY 4.0), and MNIST.
- Page structure follows the [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template).
- [Bulma](https://bulma.io/) (MIT License) and [Font Awesome Free](https://fontawesome.com/) icons (license in
  `static/js/fontawesome.all.min.js`).
