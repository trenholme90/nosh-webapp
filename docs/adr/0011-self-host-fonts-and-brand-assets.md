# Self-host fonts and brand assets

## Status

Accepted

## Context

The brief targets older, small phones. A font CDN holds up first paint behind a DNS lookup and TLS handshake to another origin before the font request even starts. The logo artwork in the brief is a JPEG whose greens sample as a scatter of compression artefacts (`#60D19B`, `#5FD09C`, …) clustered around the palette's `--nosh-green` `#62CC9B`.

## Decision

Nunito and Nunito Sans are served from `/fonts` as latin-subset variable woff2. The logo is traced to SVG (`nosh-mark.svg`, `nosh-wordmark.svg`) and loaded as separate files, so it stays cacheable and out of the JS bundle. The SVGs use the exact palette values from the brief's visual identity page rather than colours sampled from the JPEG. That is not a recolour: there is no single sampled colour to be faithful to, and the palette is the authority.

## Consequences

- No third-party request on the critical path, and no dependency on a CDN being up.
- We carry the font files, and a subset means characters outside latin need new files.
- The brand colours have a single source of truth.
