-- Create main land records table
CREATE TABLE land_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Basic Info
    district VARCHAR(255) NOT NULL,
    taluka VARCHAR(255) NOT NULL,
    village VARCHAR(255) NOT NULL,
    area_value DECIMAL(10,4) NOT NULL,
    area_unit VARCHAR(10) NOT NULL CHECK (area_unit IN ('acre', 'guntha', 'sq_m')),
    s_no_type VARCHAR(20) NOT NULL CHECK (s_no_type IN ('s_no', 'block_no', 're_survey_no')),
    s_no VARCHAR(255) NOT NULL,
    is_promulgation BOOLEAN DEFAULT false,
    block_no VARCHAR(255),
    re_survey_no VARCHAR(255),
    integrated_712 VARCHAR(255),
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'submitted')),
    current_step INTEGER DEFAULT 1
);

-- Create year slabs table
CREATE TABLE year_slabs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    land_record_id UUID REFERENCES land_records(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    s_no VARCHAR(255) NOT NULL,
    integrated_712 VARCHAR(255),
    paiky BOOLEAN DEFAULT false,
    paiky_count INTEGER DEFAULT 0,
    ekatrikaran BOOLEAN DEFAULT false,
    ekatrikaran_count INTEGER DEFAULT 0
);

-- Create slab entries table
CREATE TABLE slab_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year_slab_id UUID REFERENCES year_slabs(id) ON DELETE CASCADE,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('paiky', 'ekatrikaran')),
    s_no VARCHAR(255) NOT NULL,
    area_value DECIMAL(10,4) NOT NULL,
    area_unit VARCHAR(10) NOT NULL CHECK (area_unit IN ('acre', 'guntha', 'sq_m')),
    integrated_712 VARCHAR(255)
);

-- Create farmers table
CREATE TABLE farmers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name VARCHAR(255) NOT NULL,
    area_value DECIMAL(10,4) NOT NULL,
    area_unit VARCHAR(10) NOT NULL CHECK (area_unit IN ('acre', 'guntha', 'sq_m'))
);

-- Create panipatrak table
CREATE TABLE panipatraks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    land_record_id UUID REFERENCES land_records(id) ON DELETE CASCADE,
    year_slab_id UUID REFERENCES year_slabs(id) ON DELETE CASCADE,
    s_no VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create panipatrak farmers junction table
CREATE TABLE panipatrak_farmers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    panipatrak_id UUID REFERENCES panipatraks(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE
);

-- Create nondhs table
CREATE TABLE nondhs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    land_record_id UUID REFERENCES land_records(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    s_no_type VARCHAR(20) NOT NULL CHECK (s_no_type IN ('s_no', 'block_no', 're_survey_no')),
    affected_s_nos TEXT[], -- Array of strings
    nondh_doc_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create nondh details table
CREATE TABLE nondh_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nondh_id UUID REFERENCES nondhs(id) ON DELETE CASCADE,
    s_no VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    sub_type VARCHAR(255),
    vigat TEXT,
    status VARCHAR(20) DEFAULT 'Valid' CHECK (status IN ('Valid', 'Invalid', 'Nullified')),
    show_in_output BOOLEAN DEFAULT true,
    has_documents BOOLEAN DEFAULT false,
    doc_upload_url TEXT,
    owner_relations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_land_records_district ON land_records(district);
CREATE INDEX idx_land_records_status ON land_records(status);
CREATE INDEX idx_year_slabs_land_record ON year_slabs(land_record_id);
CREATE INDEX idx_panipatraks_land_record ON panipatraks(land_record_id);
CREATE INDEX idx_nondhs_land_record ON nondhs(land_record_id);

-- Enable Row Level Security (RLS)
ALTER TABLE land_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE year_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE slab_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE panipatraks ENABLE ROW LEVEL SECURITY;
ALTER TABLE panipatrak_farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nondhs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nondh_details ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - adjust based on your auth requirements)
CREATE POLICY "Allow all operations on land_records" ON land_records FOR ALL USING (true);
CREATE POLICY "Allow all operations on year_slabs" ON year_slabs FOR ALL USING (true);
CREATE POLICY "Allow all operations on slab_entries" ON slab_entries FOR ALL USING (true);
CREATE POLICY "Allow all operations on farmers" ON farmers FOR ALL USING (true);
CREATE POLICY "Allow all operations on panipatraks" ON panipatraks FOR ALL USING (true);
CREATE POLICY "Allow all operations on panipatrak_farmers" ON panipatrak_farmers FOR ALL USING (true);
CREATE POLICY "Allow all operations on nondhs" ON nondhs FOR ALL USING (true);
CREATE POLICY "Allow all operations on nondh_details" ON nondh_details FOR ALL USING (true);
