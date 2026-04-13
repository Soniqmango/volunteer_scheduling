-- ============================================================
-- PTA Store Volunteer Scheduling – Initial Schema
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────
-- Extends auth.users; created automatically via trigger below.
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'volunteer'
                CHECK (role IN ('admin', 'volunteer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Closed Dates ─────────────────────────────────────────────
-- Dates on which the store is closed (holidays, etc.).
CREATE TABLE closed_dates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date       DATE        NOT NULL UNIQUE,
  reason     TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Signups ──────────────────────────────────────────────────
-- One row per volunteer per shift.
CREATE TABLE signups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date   DATE        NOT NULL,
  shift_type   TEXT        NOT NULL CHECK (shift_type IN ('morning', 'afternoon')),
  volunteer_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_fulfilled BOOLEAN     NOT NULL DEFAULT FALSE,
  fulfilled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A volunteer can only sign up once per shift
  UNIQUE (shift_date, shift_type, volunteer_id)
);

-- ── Comments ─────────────────────────────────────────────────
-- Per-shift discussion / coverage requests.
CREATE TABLE comments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date          DATE        NOT NULL,
  shift_type          TEXT        NOT NULL CHECK (shift_type IN ('morning', 'afternoon')),
  author_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content             TEXT        NOT NULL,
  is_coverage_request BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Helper Functions
-- ============================================================

-- Returns TRUE when the calling user has the admin role.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

-- ============================================================
-- Capacity Enforcement Trigger
-- Prevents a shift from being over-booked.
-- Morning: max 2 volunteers   Afternoon: max 3 volunteers
-- ============================================================
CREATE OR REPLACE FUNCTION check_shift_capacity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  max_slots     INTEGER;
  current_count INTEGER;
BEGIN
  max_slots := CASE WHEN NEW.shift_type = 'morning' THEN 2 ELSE 3 END;

  SELECT COUNT(*) INTO current_count
  FROM signups
  WHERE shift_date = NEW.shift_date
    AND shift_type = NEW.shift_type;

  IF current_count >= max_slots THEN
    RAISE EXCEPTION 'shift_full: This shift is already at full capacity.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_shift_capacity
  BEFORE INSERT ON signups
  FOR EACH ROW EXECUTE FUNCTION check_shift_capacity();

-- ============================================================
-- Auto-create Profile on New Auth User
-- The first ever user becomes admin; all subsequent users are
-- volunteers.  Role can be changed manually in Supabase Studio.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_count INTEGER;
  user_role  TEXT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  user_role := CASE WHEN user_count = 0 THEN 'admin' ELSE 'volunteer' END;

  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', user_role)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Row-Level Security
-- ============================================================
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE closed_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE signups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments    ENABLE ROW LEVEL SECURITY;

-- profiles ────────────────────────────────────────────────────
CREATE POLICY "profiles: authenticated read all"
  ON profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "profiles: update own row"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- closed_dates ────────────────────────────────────────────────
CREATE POLICY "closed_dates: authenticated read all"
  ON closed_dates FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "closed_dates: admin write"
  ON closed_dates FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- signups ─────────────────────────────────────────────────────
CREATE POLICY "signups: authenticated read all"
  ON signups FOR SELECT TO authenticated USING (TRUE);

-- Volunteers insert their own; admins insert for anyone
CREATE POLICY "signups: insert own"
  ON signups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "signups: admin insert any"
  ON signups FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Volunteers delete their own; admins delete any
CREATE POLICY "signups: delete own or admin"
  ON signups FOR DELETE TO authenticated
  USING (auth.uid() = volunteer_id OR is_admin());

-- Only admins can update (e.g. mark fulfilled)
CREATE POLICY "signups: admin update"
  ON signups FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- comments ────────────────────────────────────────────────────
CREATE POLICY "comments: authenticated read all"
  ON comments FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "comments: insert own"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "comments: delete own or admin"
  ON comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR is_admin());

-- ============================================================
-- Realtime – subscribe to these tables for live updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE signups;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE closed_dates;