# Configuração de Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com o seguinte conteúdo:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mlkylyhnjmdjfiyuacev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_lkWuVLWGrjyn2XMDw7GCYA_Wt5y94iI
SUPABASE_SERVICE_ROLE_KEY=sb_secret_VV4LgW6dzMOSb-hMdvK85A_Boa07rHY

# Webhook Secret (para validação HMAC)
WEBHOOK_SECRET=your_webhook_secret_change_in_production
```

## ⚠️ Importante

1. O arquivo `.env.local` não deve ser versionado (já está no .gitignore)
2. Nunca compartilhe suas chaves publicamente
3. A URL do Supabase foi inferida do projeto ID: `mlkylyhnjmdjfiyuacev`
4. Se a URL estiver incorreta, verifique no dashboard do Supabase: Settings > API

## 🔍 Verificando a URL Correta

1. Acesse o dashboard do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em Settings > API
4. Copie a "Project URL" e use no `NEXT_PUBLIC_SUPABASE_URL`

## 📝 Próximos Passos

Após criar o `.env.local`:

1. Execute as migrations do Supabase (veja `supabase/migrations/001_initial_schema.sql`)
2. Inicie o servidor: `npm run dev`
3. Acesse: `http://localhost:3000`

