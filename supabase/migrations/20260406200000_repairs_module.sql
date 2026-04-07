-- Repairs Module: vehicles registry, repair/maintenance/recall lookups, AI guides, parts orders

-- Central vehicle registry (single source of truth for all VINs)
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin TEXT NOT NULL,
  year INT,
  make TEXT,
  model TEXT,
  engine TEXT,
  engine_type TEXT,
  mileage INT,
  color TEXT,
  plate TEXT,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vin, business_id)
);

-- Cached repair/diagnostic results from CarMD and VehicleDatabases
CREATE TABLE repair_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  dtc_code TEXT,
  description TEXT NOT NULL,
  urgency INT,
  urgency_desc TEXT,
  difficulty INT,
  labor_hours FLOAT,
  part_cost FLOAT,
  labor_cost FLOAT,
  misc_cost FLOAT,
  total_cost FLOAT,
  parts_json JSONB DEFAULT '[]',
  source TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached maintenance schedule data
CREATE TABLE maintenance_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  due_mileage INT,
  is_oem BOOLEAN DEFAULT TRUE,
  cycle_mileage INT,
  part_cost FLOAT,
  labor_cost FLOAT,
  total_cost FLOAT,
  parts_json JSONB,
  source TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached recall and TSB data
CREATE TABLE recall_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('recall', 'tsb')),
  description TEXT NOT NULL,
  corrective_action TEXT,
  nhtsa_id TEXT,
  source TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated step-by-step repair guides
CREATE TABLE repair_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_lookup_id UUID REFERENCES repair_lookups(id) ON DELETE SET NULL,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{"steps":[]}',
  ai_model TEXT,
  user_prompt TEXT,
  media_urls JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles(id),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PartsTech order tracking
CREATE TABLE parts_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  repair_lookup_id UUID REFERENCES repair_lookups(id) ON DELETE SET NULL,
  supplier TEXT NOT NULL,
  parts_json JSONB NOT NULL DEFAULT '[]',
  total_cost FLOAT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'delivered')),
  partstech_order_id TEXT,
  created_by UUID REFERENCES profiles(id),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_vehicles_vin_business ON vehicles(vin, business_id);
CREATE INDEX idx_vehicles_business ON vehicles(business_id);
CREATE INDEX idx_repair_lookups_vehicle ON repair_lookups(vehicle_id);
CREATE INDEX idx_repair_lookups_dtc ON repair_lookups(dtc_code);
CREATE INDEX idx_maintenance_lookups_vehicle ON maintenance_lookups(vehicle_id);
CREATE INDEX idx_recall_lookups_vehicle ON recall_lookups(vehicle_id);
CREATE INDEX idx_repair_guides_vehicle ON repair_guides(vehicle_id);
CREATE INDEX idx_parts_orders_vehicle ON parts_orders(vehicle_id);

-- RLS policies (same pattern as existing tables)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE recall_lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_orders ENABLE ROW LEVEL SECURITY;

-- Vehicles policies
CREATE POLICY "Users can view vehicles in their business" ON vehicles
  FOR SELECT USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert vehicles in their business" ON vehicles
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update vehicles in their business" ON vehicles
  FOR UPDATE USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));

-- Repair lookups policies
CREATE POLICY "Users can view repair lookups in their business" ON repair_lookups
  FOR SELECT USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert repair lookups in their business" ON repair_lookups
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));

-- Maintenance lookups policies
CREATE POLICY "Users can view maintenance lookups in their business" ON maintenance_lookups
  FOR SELECT USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert maintenance lookups in their business" ON maintenance_lookups
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));

-- Recall lookups policies
CREATE POLICY "Users can view recall lookups in their business" ON recall_lookups
  FOR SELECT USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert recall lookups in their business" ON recall_lookups
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));

-- Repair guides policies
CREATE POLICY "Users can view repair guides in their business" ON repair_guides
  FOR SELECT USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert repair guides in their business" ON repair_guides
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));

-- Parts orders policies
CREATE POLICY "Users can view parts orders in their business" ON parts_orders
  FOR SELECT USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert parts orders in their business" ON parts_orders
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update parts orders in their business" ON parts_orders
  FOR UPDATE USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
