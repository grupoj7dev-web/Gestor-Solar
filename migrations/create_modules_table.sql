-- Create modules table
CREATE TABLE IF NOT EXISTS public.modules (
    id BIGSERIAL PRIMARY KEY,
    brand VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    power VARCHAR(50) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_modules_brand ON public.modules(brand);
CREATE INDEX IF NOT EXISTS idx_modules_created_by ON public.modules(created_by);

-- Enable Row Level Security
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all modules"
    ON public.modules FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert modules"
    ON public.modules FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own modules"
    ON public.modules FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own modules"
    ON public.modules FOR DELETE
    USING (auth.uid() = created_by);
