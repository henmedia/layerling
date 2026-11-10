# Contributing

***English** · [Deutsch](CONTRIBUTING.de.md)*

Thanks for helping improve layerling.

## Local Setup

```bash
npm install
npm run dev
```

The app runs at `http://127.0.0.1:3000/` by default.

## Before Opening a Pull Request

- Keep changes focused.
- Avoid unrelated refactors.
- Run `npm run typecheck` and `npm test` (the unit tests). The CI runs both, then `npm run test:e2e`, the production
  build and the static export, and fails when a build step changed a file that is committed.
- Changed a text of the interface or the guide: run `npm run guide` and `npm run i18n:status`. Changed a colour in
  `globals.css`: run `npm run theme:graphite` (a test fails while the Graphite theme is out of date).
- Manually test the editor workflow you changed.
- Include screenshots or short recordings for UI changes when possible.
- Call out changes to storage, import, export, grouping, or undo/redo behavior.

## Editor Profiles for Tools

When adding a tool or a tool option, make it individually configurable through the versioned
[editor profile](../README.md#editor-profiles). Existing tools can adopt the same rules one at a time.

- Give each tool a stable ID and let the profile show or hide its editor controls independently.
  A visible tool still follows the usual selection and availability rules.
- Give each user-facing dialog option a stable ID under its tool. Support hiding the option and,
  for options with a value, a typed starting value. Validate profile values with the same rules
  the tool uses for its own inputs.
- Document how profile defaults interact with remembered settings. If an option supports a lock,
  require a valid explicit value and let the lock take precedence over the remembered setting.
- Keep the existing behavior when the profile omits the tool or option. Test the normal workflow
  without a profile, the profile override, and any interaction with remembered settings.

See [Fillet in the example profile](../docs/examples/editor-profile.json) and the
[profile tests](../tests/unit/editorProfile.test.ts) for the current pattern.

## Areas That Need Care

- STL import/export
- Imported mesh transforms
- Grouping, hole subtraction, and ungrouping
- Undo/redo history
- Project persistence and dashboard thumbnails
- Shape gizmos, snapping, and rotated-object dimensions

## Style

- Prefer existing project patterns before adding new abstractions.
- Keep UI behavior local to the relevant component unless the behavior is shared.
- Use TypeScript types instead of loose object shapes where practical.
- Keep comments short and useful.

## Contribution Licensing

Unless explicitly agreed otherwise in writing, by submitting a contribution you license it under the GNU Affero General Public License v3.0 only (`AGPL-3.0-only`). See [LICENSE](../LICENSE).
