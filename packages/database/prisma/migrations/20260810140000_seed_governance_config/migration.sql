-- Governance tuning knobs, with defaults chosen to be conservative.
--
-- Values are stored as JSON strings to match the admin PATCH path, which writes
-- String(value); getSystemConfigValue coerces with Number() and handles both,
-- but a consistent shape avoids surprises after the first admin edit.
--
-- Idempotent: ON CONFLICT DO NOTHING, so an operator's later change is never
-- overwritten by a re-run.

INSERT INTO "system_config" (key, value, "updatedAt")
VALUES
  -- How long the national tenant has to break a tie, measured from detection
  -- rather than from proposal creation. A tie found on day 6.9 of a 7-day
  -- proposal would otherwise be unbreakable.
  ('tieBreakTtlDays', '"3"'::jsonb, NOW()),

  -- Ceiling on how long a voting proxy may be granted for. Proxies must expire.
  ('maxProxyDays', '"30"'::jsonb, NOW()),

  -- How many organisations one person may cast for on a single proposal.
  -- 1 closes a gap that predates proxies entirely: because org authority is
  -- inherited through ancestry, an admin of a grandparent org that sits above
  -- two co-parents can already vote twice on the same proposal.
  ('maxVotesPerUserPerProposal', '"1"'::jsonb, NOW()),

  -- Warn in the UI when one person could control at least this share of the
  -- electorate's weight. 5000 bps = 50%.
  ('concentrationWarnBps', '"5000"'::jsonb, NOW()),

  -- What happens when a tie cannot be broken. EXPIRED is honest about a failed
  -- process; REJECTED would manufacture a decision nobody made.
  ('tieUnresolvedOutcome', '"EXPIRED"'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;
