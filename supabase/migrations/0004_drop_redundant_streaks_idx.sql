-- 0004: drop the redundant index added by 0003.
--
-- 0003 added `streaks_user_id_idx`, but the table already had a unique index on the same column
-- (`streaks_user_id_key`, from the unique constraint). A second index on an identical column set
-- costs write throughput and buys nothing. `hydration_logs_user_id_idx` stays: that table had no
-- index on user_id at all.
--
-- Idempotent.

drop index if exists public.streaks_user_id_idx;
