-- Tabela de eventos de webhook
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_event ON webhook_events(event);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- Tabela de flows
CREATE TABLE IF NOT EXISTS flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para flows
CREATE INDEX IF NOT EXISTS idx_flows_active ON flows(active);
CREATE INDEX IF NOT EXISTS idx_flows_updated_at ON flows(updated_at DESC);

-- Tabela de logs de execução de flows
CREATE TABLE IF NOT EXISTS flow_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  webhook_event_id UUID NOT NULL REFERENCES webhook_events(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'success', 'error')),
  executed_nodes TEXT[] DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Índices para flow_execution_logs
CREATE INDEX IF NOT EXISTS idx_flow_execution_logs_flow_id ON flow_execution_logs(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_execution_logs_webhook_event_id ON flow_execution_logs(webhook_event_id);
CREATE INDEX IF NOT EXISTS idx_flow_execution_logs_started_at ON flow_execution_logs(started_at DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at em flows
CREATE TRIGGER update_flows_updated_at
  BEFORE UPDATE ON flows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

