-- Confirmed deletes from the dashboard.
-- Quotes, jobs and their history stay protected: a DELETE is refused unless the same transaction has
-- first switched on "takeoff.confirmed_delete" (only the dashboard's type-to-confirm delete does that,
-- and only for the one project / record being removed). UPDATEs of history and TRUNCATE stay blocked.
-- This migration changes no rows and drops nothing; it only replaces the two guard functions.

CREATE OR REPLACE FUNCTION "takeoff_retain_history"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_LEVEL = 'ROW' AND TG_OP = 'DELETE' AND current_setting('takeoff.confirmed_delete', true) = 'on' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Takeoff history records are immutable' USING ERRCODE = '23514';
END;
$$;

CREATE OR REPLACE FUNCTION "takeoff_no_delete"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_LEVEL = 'ROW' AND TG_OP = 'DELETE' AND current_setting('takeoff.confirmed_delete', true) = 'on' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Takeoff quotes and supplier links cannot be deleted' USING ERRCODE = '23514';
END;
$$;
