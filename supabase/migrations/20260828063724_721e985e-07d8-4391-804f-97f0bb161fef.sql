CREATE TABLE public.solar_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  country_code TEXT,
  language TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  address TEXT,
  score INTEGER,
  data_quality TEXT,
  result JSONB
);
GRANT ALL ON public.solar_sessions TO service_role;
ALTER TABLE public.solar_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL
);
CREATE INDEX chat_messages_session_idx ON public.chat_messages (session_id, created_at);
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.api_cache (
  cache_key TEXT NOT NULL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL
);
GRANT ALL ON public.api_cache TO service_role;
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;