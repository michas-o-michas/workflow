#!/bin/bash

# Script para criar o arquivo .env.local com as credenciais do Supabase

cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mlkylyhnjmdjfiyuacev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_lkWuVLWGrjyn2XMDw7GCYA_Wt5y94iI
SUPABASE_SERVICE_ROLE_KEY=sb_secret_VV4LgW6dzMOSb-hMdvK85A_Boa07rHY

# Webhook Secret (para validação HMAC)
WEBHOOK_SECRET=your_webhook_secret_change_in_production
EOF

echo "✅ Arquivo .env.local criado com sucesso!"
echo ""
echo "⚠️  IMPORTANTE:"
echo "1. Verifique se a URL do Supabase está correta"
echo "2. Execute as migrations do Supabase"
echo "3. Inicie o servidor com: npm run dev"

