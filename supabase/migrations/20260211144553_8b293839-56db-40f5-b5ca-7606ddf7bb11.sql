
-- Bounties table
CREATE TABLE public.bounties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_address TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  criteria TEXT NOT NULL,
  reward NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'completed')),
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bounty submissions table
CREATE TABLE public.bounty_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bounty_id UUID NOT NULL REFERENCES public.bounties(id) ON DELETE CASCADE,
  submitter_address TEXT NOT NULL,
  description TEXT NOT NULL,
  link TEXT NOT NULL,
  score INTEGER,
  feedback TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Betting events table
CREATE TABLE public.betting_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_address TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'confirming', 'resolving', 'resolved')),
  result TEXT CHECK (result IN ('for', 'against')),
  resolution TEXT,
  total_for NUMERIC NOT NULL DEFAULT 0,
  total_against NUMERIC NOT NULL DEFAULT 0,
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bets table
CREATE TABLE public.bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.betting_events(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('for', 'against')),
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Deployed contracts table
CREATE TABLE public.deployed_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deployer_address TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  contract_address TEXT,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'deploying' CHECK (status IN ('deploying', 'deployed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounty_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.betting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployed_contracts ENABLE ROW LEVEL SECURITY;

-- Public read policies (anyone can view)
CREATE POLICY "Anyone can view bounties" ON public.bounties FOR SELECT USING (true);
CREATE POLICY "Anyone can view submissions" ON public.bounty_submissions FOR SELECT USING (true);
CREATE POLICY "Anyone can view betting events" ON public.betting_events FOR SELECT USING (true);
CREATE POLICY "Anyone can view bets" ON public.bets FOR SELECT USING (true);
CREATE POLICY "Anyone can view contracts" ON public.deployed_contracts FOR SELECT USING (true);

-- Public insert policies (wallet-based, no auth required since this is a web3 app)
CREATE POLICY "Anyone can create bounties" ON public.bounties FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can submit work" ON public.bounty_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can create events" ON public.betting_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can place bets" ON public.bets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can deploy contracts" ON public.deployed_contracts FOR INSERT WITH CHECK (true);

-- Public update policies (for status changes)
CREATE POLICY "Anyone can update bounties" ON public.bounties FOR UPDATE USING (true);
CREATE POLICY "Anyone can update submissions" ON public.bounty_submissions FOR UPDATE USING (true);
CREATE POLICY "Anyone can update events" ON public.betting_events FOR UPDATE USING (true);
CREATE POLICY "Anyone can update contracts" ON public.deployed_contracts FOR UPDATE USING (true);
