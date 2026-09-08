-- LGPD: registro de consentimento aos Termos de Uso / Política de Privacidade.
-- Coluna aditiva na tabela "user" do Better Auth (migrations/0001_auth.sql é
-- gerado e não deve ser editado à mão — extensões entram em arquivos novos).
alter table "user" add column if not exists "termsAcceptedAt" timestamptz;
