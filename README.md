# gifviewer

**[gifviewer.zxcv.fyi](https://gifviewer.zxcv.fyi)**  A free, browser-only GIF viewer.

Upload any GIF and get full frame-by-frame control: play, pause, scrub through the timeline, and export any frame as a high-quality **WebP**, **PNG**, or **JPEG**  all without leaving your browser.

> Want to record a GIF first? Check out **[gifcap.dev](https://gifcap.dev/)**.

## Features

-  Frame-by-frame scrubbing with a smooth timeline slider
-  Play / pause with per-frame delay timing
-  Step forward/backward one frame at a time
-  Export any frame as WebP, PNG, or JPEG
-  100% client-side  your files never leave your browser
-  Responsive layout for desktop and mobile

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) components (Button, Slider)
- [gifuct-js](https://github.com/matt-way/gifuct-js) for GIF frame extraction
- [Lucide React](https://lucide.dev/) icons

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The output is in `dist/` and is a fully static site  no server required.

## Deployment

The site is automatically deployed to GitHub Pages via the included GitHub Actions workflow on every push to `main`.

## License

[MIT](LICENSE)

## Author

Made by [Jeremie Bornais](https://jeremie.bornais.ca)

