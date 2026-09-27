-- These tables are not used by CredScore. Close the anonymous write policies.
DROP POLICY IF EXISTS "Anyone can create bounties" ON public.bounties;
DROP POLICY IF EXISTS "Anyone can submit work" ON public.bounty_submissions;
DROP POLICY IF EXISTS "Anyone can create events" ON public.betting_events;
DROP POLICY IF EXISTS "Anyone can place bets" ON public.bets;
DROP POLICY IF EXISTS "Anyone can deploy contracts" ON public.deployed_contracts;
DROP POLICY IF EXISTS "Anyone can update bounties" ON public.bounties;
DROP POLICY IF EXISTS "Anyone can update submissions" ON public.bounty_submissions;
DROP POLICY IF EXISTS "Anyone can update events" ON public.betting_events;
DROP POLICY IF EXISTS "Anyone can update contracts" ON public.deployed_contracts;

CREATE POLICY "bounties writes disabled" ON public.bounties FOR INSERT WITH CHECK (false);
CREATE POLICY "submissions writes disabled" ON public.bounty_submissions FOR INSERT WITH CHECK (false);
CREATE POLICY "events writes disabled" ON public.betting_events FOR INSERT WITH CHECK (false);
CREATE POLICY "bets writes disabled" ON public.bets FOR INSERT WITH CHECK (false);
CREATE POLICY "contracts writes disabled" ON public.deployed_contracts FOR INSERT WITH CHECK (false);
CREATE POLICY "bounties updates disabled" ON public.bounties FOR UPDATE USING (false);
CREATE POLICY "submissions updates disabled" ON public.bounty_submissions FOR UPDATE USING (false);
CREATE POLICY "events updates disabled" ON public.betting_events FOR UPDATE USING (false);
CREATE POLICY "contracts updates disabled" ON public.deployed_contracts FOR UPDATE USING (false);
