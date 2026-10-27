# Website content

How the site is put together, and how to add things.

```
index.html              page layout and fixed text (hero, about, "what I do", contact)
css/site.css            all styling
js/data.js              ← papers, talks, posters, experience, grants, skills (edit this)
js/site.js              renders data.js + slide viewer, lightbox, filters, animations
CV_Nicolo_Pagan.pdf     the CV linked from the site (overwrite to update)

assets/                 what the site serves (generated — don't edit by hand)
├── figures/<paper>.webp        figure crops shown on paper cards
├── slides/<talk>/NN.webp       one image per slide (+ thumbs/)
├── posters/<poster>.webp       full poster (+ -thumb.webp)
└── papers/*.pdf                open-access PDFs without a stable public link

content/                sources (kept in the repo)
├── talks/<talk>.pdf            original slide decks (offered as "PDF" download)
├── posters/<poster>.pdf        original posters
├── figures/                    copies of the figure crops
└── material_for_website/       your raw material — git-ignored, never published
```

## Adding something
1. Put the source PDF in `content/talks/`, `content/posters/` or keep it in
   `content/material_for_website/` (git-ignored).
2. Export the figure / slide images into `assets/` (figures as WebP, slides as
   `assets/slides/<talk>/NN.webp` plus `thumbs/` and `hd/`).
3. Add an entry to the matching list in `js/data.js`.
File names: lowercase, dashes, no spaces or accents.
