# md-viewer

A [Claude Code](https://claude.com/claude-code) mod that shows markdown files rendered in a side pane.

- **`/md <file>`** opens any markdown (or text) file, relative to the session folder or an absolute path.
- **Click a markdown file in chat** and it opens in the same pane. Markdown links (`[notes](docs/notes.md)`) and inline-code mentions (`` `docs/notes.md` ``) both work. Code fences and web links are left alone.

## Install

In a terminal `claude` session:

```
/plugin install md-viewer --marketplace wdoyle2/claude-md-viewer
```

Answer `y` to add the marketplace, then choose the **user** scope so it loads in every session.

The `/plugin` command is not available inside the desktop app's Code tab. Run the install once from a terminal; after that the mod also loads in desktop sessions started on the same machine.

## Notes

- Clicking a link is only documented for the fullscreen terminal. If a click does nothing in your setup (the desktop app, for example), `/md <file>` always works.
- A chat message that contains a markdown-file link is redrawn by the mod, so it loses the small bullet that opens a reply. Messages without one are untouched.
- Bare filenames in plain prose are not clickable, only links and `backticked` names.
- The mod only reads a file when you click a link or run `/md`. It never writes anything.

## Update

```
claude plugin update md-viewer
```

## Develop

```
claude plugin validate .
claude plugin test .
```

MIT licensed.
