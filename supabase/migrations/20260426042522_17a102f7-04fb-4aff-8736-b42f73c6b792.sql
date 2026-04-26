INSERT INTO public.user_roles (user_id, role)
VALUES ('2de5d273-8a04-4fba-b2e4-0fb8cb37d7ac', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;