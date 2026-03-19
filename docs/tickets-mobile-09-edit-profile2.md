## Follow-up fix found during testing
The `skills` field fails to save with:
`malformed array literal`

Root cause:
- backend `skills` field is stored as an array type
- mobile form is sending a plain string instead of the expected array shape

Fix requirement:
- serialize `skills` correctly before update
- keep other scalar fields unchanged
- do not change backend or web app behavior
- if UX remains a single text input, convert comma-separated input into a trimmed string array before save
- when loading existing values into the form, convert array values back into a readable string for the input

## Implementation note (2026-03-19)

Fixed in `EditProfileScreen.tsx`:
- `profileToForm`: detects if `skills` is an array (as returned by Supabase) and joins it with `", "` for display in the text input.
- `handleSave`: splits the comma-separated string on `,`, trims each segment, drops empties, and sends the resulting `string[]` to Supabase. Uses a type cast since the shared `ProfileUpdate` type declares `skills` as `string` but the DB column is `text[]`.
- Label updated to "Skills (comma-separated)" to clarify expected input format.
- No changes to web app, backend, or shared types.