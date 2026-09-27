# email-qa

Static checks for HTML email templates. Paste or upload a template, get a list of problems with line numbers before it goes out to a real inbox.

Most email bugs that reach production are not rendering puzzles. They are small things that slip through: a `href="#"` left over from the design handoff, an image without `alt`, a relative image path, a template that grew past Gmail's clipping limit. This tool catches those.

> Work in progress. The core checker works; the API and web UI are next.

## What it checks

| Rule | Severity | What it catches |
| --- | --- | --- |
| `link-href` | error / warning | empty, `#`, `javascript:` or relative links; `http://` links |
| `img-alt` | error | images without an `alt` attribute |
| `img-src` | error / warning | relative paths, base64 images, `http://` images |
| `img-width` | warning | images without a `width` attribute (Outlook) |
| `unsupported-elements` | error / warning | `script`, `iframe`, `form`, `video`, inline `svg`, ... |
| `external-css` | error / warning | `<link rel="stylesheet">` and `@import` |
| `css-support` | warning | flexbox, grid and `position` in inline styles or `<style>` |
| `gmail-clipping` | error / warning | HTML over (or close to) Gmail's ~102 KB limit |
| `dark-mode` | warning / info | dark mode styles without the `color-scheme` meta tag |
| `document-meta` | warning | missing `lang`, `<title>` or viewport meta |

ESP merge tags such as `%%field%%`, `{{ var }}`, `*|UNSUB|*` and `#SPCUNSUBSCRIBE#` are treated as valid link targets.

## Usage

```ts
import { analyze } from "@email-qa/core";

const report = analyze(html);

report.counts; // { error: 2, warning: 1, info: 0 }
report.issues; // [{ rule, severity, message, line, snippet }, ...]
```

You can also pass your own list of rules as the second argument.

## Project structure

```
packages/
  core/   the checker (TypeScript, no DOM needed, runs in Node or the browser)
```

## Development

Requires Node 20+.

```bash
npm install
npm test
npm run build
```

## Roadmap

- [x] Core rules with line numbers and snippets
- [ ] REST API (upload a file or post HTML, get the report as JSON)
- [ ] Web UI with the template preview and issues side by side
- [ ] Optional link check (follow redirects, report 4xx/5xx)
- [ ] Docker image and CI
