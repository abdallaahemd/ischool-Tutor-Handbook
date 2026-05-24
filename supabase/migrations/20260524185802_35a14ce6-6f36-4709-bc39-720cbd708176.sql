
CREATE TABLE public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for login"
ON public.admins
FOR SELECT
USING (true);

INSERT INTO public.admins (email, password, name)
VALUES ('team04@ischool.com', 'Password@123', 'iSchool Admin');
