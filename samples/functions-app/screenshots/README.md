# Preview asset

`preview.gif` is referenced by the sample README and by the Template Gallery
(`docs/samples/index.md`). Until it exists, the gallery renders an empty poster tile.

**Target:** 1600x900, roughly 15 seconds, under about 3 MB. That matches the other samples in
this repo (`process-app-v1` is 2.0 MB, `conversational-agent-app` 1.1 MB).

## Before recording

- **Sign in first.** Start the recording on the shop itself; nobody needs to watch an OAuth
  redirect.
- Empty the basket by reloading.
- Close DevTools and any extension sidebars.
- Pick light or dark and stay there. The theme toggle is worth one flick at the end if there is
  room, but switching mid-flow is distracting.
- Set the browser content area to 1600x900, or record larger and downscale.

## Shot list

| # | approx | action | what should be on screen |
|---|---|---|---|
| 1 | 0-2s | hold on the hero | Headline and the three cards explaining why the codes are hidden |
| 2 | 2-4s | scroll to the catalogue | Card grid with icon tiles, category buttons above |
| 3 | 4-6s | click a category, then All | Grid filters instantly, no spinner, since filtering is local |
| 4 | 6-9s | add two or three items | Cards gain a count badge and a primary border; basket stats climb |
| 5 | 9-11s | hold | Basket lines and subtotal, all priced by the `quote` function |
| 6 | 11-13s | type `SPRING25`, press Apply | Discount row rises in, total flashes, toast confirms the offer |
| 7 | 13-15s | hold | Discounted total and the "You save" stat in green |

**Optional tail** if there is room: type a nonsense code and press Apply, so the rejection shows.
It reinforces that the check is real and happening somewhere the browser cannot reach. The
discount landing is the more important frame though, so do not sacrifice it.

## Valid codes

`WELCOME10` (10%), `SPRING25` (25%), `STAFF50` (50%). Matching is case-insensitive. These live in
the `promo-codes` Secret asset, so they will differ if the asset was set up with other values.

## Tools

**ScreenToGif** (Windows, free) is the simplest: record a region, trim, save as GIF, and use its
optimiser to get under 3 MB. Alternatively record with Game Bar (`Win+G`) and convert:

```bash
ffmpeg -i capture.mp4 -vf "fps=12,scale=1600:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" preview.gif
```

12 fps is plenty here. It is cursor movement and text rather than animation, and it keeps the file
small.

Save the result as `samples/functions-app/screenshots/preview.gif`. The README and the gallery
already point at that path, so nothing else needs changing.
