# Hashup Game Uploader

## Web-component usage
```
<hashup-game-uploader appName="Example app"></hashup-game-uploader>

<script type="module" src="https://unpkg.com/hashup-game-uploader?module"></script>
<script>
this.addEventListener('file-uploaded', ({ details }) => console.info(details))
</script>
```

## Install

```bash
npm i
```

## Build

```bash
npm run build
```

To watch files and rebuild when the files are modified, run the following command in a separate shell:

```bash
npm run build:watch
```

## Testing

```bash
npm test
```

```bash
npm test:watch
```

Alternatively the `test:prod` and `test:prod:watch` commands will run your tests in Lit's production mode.

## Dev Server

```bash
npm run serve
```

## Linting

```bash
npm run lint
```

## Static Site

This project includes a simple website generated with the [eleventy](11ty.dev) static site generator and the templates and pages in `/docs-src`.
To build the site, run:

```bash
npm run docs
```

To serve the site locally, run:

```bash
npm run docs:serve
```

To watch the site files, and re-build automatically, run:

```bash
npm run docs:watch
```

The site will usually be served at http://localhost:8000.
