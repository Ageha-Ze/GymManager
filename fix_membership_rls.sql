-- Fix Row-Level Security policy for member_memberships table
-- Allow authenticated users to insert into member_memberships

-- Drop the existing policies to recreate them properly
DO $$
BEGIN
    -- Check if policies exist and drop them
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'member_memberships' AND policyname = 'All can view memberships') THEN
        DROP POLICY "All can view memberships" ON member_memberships;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'member_memberships' AND policyname = 'All authenticated can view memberships') THEN
        DROP POLICY "All authenticated can view memberships" ON member_memberships;
    END IF;

    -- Drop any other conflicting policies
    DROP POLICY IF EXISTS "All can insert memberships" ON member_memberships;
    DROP POLICY IF EXISTS "All can update memberships" ON member_memberships;
    DROP POLICY IF EXISTS "Only owner can delete memberships" ON member_memberships;

END $$;

-- Create new policies with proper permissions
CREATE POLICY "All authenticated can view memberships" ON member_memberships
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated can insert memberships" ON member_memberships
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "All authenticated can update memberships" ON member_memberships
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Only owner can delete memberships" ON member_memberships
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'owner'
    )
  );

-- Also fix membership_packages DELETE policy
DROP POLICY IF EXISTS "All can view packages" ON membership_packages;
DROP POLICY IF EXISTS "All can insert packages" ON membership_packages;
DROP POLICY IF EXISTS "All can update packages" ON membership_packages;
DROP POLICY IF EXISTS "Only owner can delete packages" ON membership_packages;

CREATE POLICY "Authenticated users can view packages" ON membership_packages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert packages" ON membership_packages
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update packages" ON membership_packages
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Only owner can delete packages" ON membership_packages
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'owner'
    )
  );

-- Fix all missing INSERT/UPDATE/DELETE policies

-- Payments table policies
DROP POLICY IF EXISTS "All can view payments" ON payments;
DROP POLICY IF EXISTS "All can insert payments" ON payments;
DROP POLICY IF EXISTS "All can update payments" ON payments;

CREATE POLICY "Authenticated users can view payments" ON payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert payments" ON payments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments" ON payments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete payments" ON payments
  FOR DELETE TO authenticated USING (true);

-- Check-ins table policies
DROP POLICY IF EXISTS "All can view check-ins" ON check_ins;
DROP POLICY IF EXISTS "All can insert check-ins" ON check_ins;
DROP POLICY IF EXISTS "All can update check-ins" ON check_ins;

CREATE POLICY "Authenticated users can view check-ins" ON check_ins
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert check-ins" ON check_ins
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update check-ins" ON check_ins
  FOR UPDATE TO authenticated USING (true);

-- Also ensure profiles table has proper RLS
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert profiles" ON profiles;

CREATE POLICY "Authenticated users can view profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert profiles" ON profiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update profiles" ON profiles
  FOR UPDATE TO authenticated USING (true);
