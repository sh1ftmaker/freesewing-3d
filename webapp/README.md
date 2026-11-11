# FreeSewing 3D (webapp)

> **Unofficial fork / derivative work.** This repository is an independent project that is **not affiliated with, endorsed by, or sponsored by FreeSewing or its maintainers**. It contains a copy of the FreeSewing source code (https://codeberg.org/freesewing/freesewing, MIT licensed, copyright Joost De Cock and the FreeSewing contributors) plus an added browser web app in [`webapp/`](webapp/). All patterns, designs and the core library are the work of the FreeSewing community. Please support the original project at https://freesewing.org and report any problems with the original code upstream. "FreeSewing" is the name of the original project; its use here is purely descriptive.

Static, fully client-side web app built on the cloned FreeSewing monorepo (v4.10.2).
`@freesewing/core`, the design packages and `@freesewing/models` are bundled from the
workspace sources (see `vite.config.js`) and run in a Web Worker; Three.js renders the result.

    npm install
    npm run dev       # dev server
    npm run build     # static output in dist/ (host anywhere)

Features: any design in `designs/`, sample-size measurements, live option sliders,
seam allowance/complete toggles, parts extruded as fabric with shadows, part spacing
(exploded view), cloth-style drape, per-part visibility, point/snippet markers.
URL params: `?design=simon&explode=0.5&drape=0.5&thick=6&points=1`.

Notes: no Emscripten/WASM is used — FreeSewing is JavaScript and runs natively in the browser.
Designs hannah, tina and toni currently fail to draft with the default sample measurements.
