-- Drop table if exists
DROP TABLE IF EXISTS processing_jobs;

-- Create processing_jobs table
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    file_name VARCHAR(255),
    file_size INTEGER,
    total_pages INTEGER,
    chunks_total INTEGER,
    chunks_processed INTEGER DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    validated_transactions INTEGER DEFAULT 0,
    final_transactions INTEGER DEFAULT 0,
    error_message TEXT,
    result JSONB,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_created_at ON processing_jobs(created_at);
CREATE INDEX idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX idx_processing_jobs_user_status ON processing_jobs(user_id, status);

-- Add status constraint
ALTER TABLE processing_jobs 
ADD CONSTRAINT chk_processing_jobs_status 
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_processing_jobs_updated_at 
    BEFORE UPDATE ON processing_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();