# SAZ v2

The new SAZ site, rebuilt from saz.format.com. Plain HTML, CSS and JS with no build step.

## First: save your images
Double-click `download-images.command` (macOS). It pulls all 239 images off Format into:
- `originals/` full-size archive copies (kept out of deploys by `.vercelignore`)
- `assets/img/` web versions, and `assets/img/thumbs/` grid versions

Until you run it, the pages load images straight from Format's CDN as a fallback. Run it **before** you close the Format account.

## Pages
| New page | Old Format URL |
|---|---|
| index.html | / |
| releases.html | /releases (all 136 items: 122 covers + 14 videos) |
| albums.html | /albums |
| journey, chances, dive, after-dark, transitions .html | the Discography pages |
| about.html | /about-us |
| press.html | /pr |
| airborn-gav.html | /airborngav |
| agency.html | /saz-the-agencymenu |
| contact.html | /submission |

`vercel.json` redirects the old Format paths to the new ones once your domain points here.

## Editing
- Text lives directly in each .html file.
- Release credits and players for the cover grids sit in the `<script type="application/json">` block at the bottom of each grid page.
- Colours and fonts are the variables at the top of `assets/css/site.css`.
- The contact form opens the visitor's email app addressed to deathbyleisure@gmail.com. To receive messages on the site itself, point the form at a service like Formspree.

`_archive-data/` holds the raw content exported from Format (JSON), for your records.
