# ZEN-228 publication handoff

The dev preview is a separate private S3/OAC distribution, with noindex response headers and robots exclusions. `deploy-dev.yml` publishes only pushes to dev using its environment-bound OIDC role.

Production promotion is a separate authorized action. The current live publisher serves the old upstream landing; merging this fork's dev branch does not update it. Publish the approved frontend legal/locale routes first, then promote the verified landing artifacts to the actual production publisher. Retain its current origin/configuration and rollback copies. Generate production robots/sitemap; do not publish the dev-only noindex export.

During that promotion, attach the reviewed `cloudfront/public-routes.js` viewer-request function to the existing landing distribution, preserving its security policies and unrelated associations. It redirects the www alias and duplicate index URLs to their canonical equivalents and preserves query values. Verify all four public URLs, robots/sitemap content types, unknown-path 404s, no-JavaScript visibility, and the exact published revision on both hostnames. No production distribution, DNS, bucket policy or publisher was changed by ZEN-228 dev work.

Search Console/Bing submission, genuine search/AI crawler access logs, and field metrics remain provider/runtime checks; source and dev browser checks do not prove indexing or AI citations.
