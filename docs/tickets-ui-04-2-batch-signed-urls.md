Goal: remove sequential await createSignedUrl loops for post media.

Must NOT change UI/logic (posts shown, attachments, reactions, deletes, permissions).

Must keep signed URL TTL at 3600.

Must not introduce new runtime deps.

Add minimal helper(s) to reuse across Feed/Admin/Profile where applicable.

Keep changes small and reversible.