const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase configuration missing. Database operations will be disabled.');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Job status constants
const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Create a new processing job
const createProcessingJob = async (jobData) => {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  if (!jobData.userId) {
    throw new Error('User ID is required');
  }

  const jobId = uuidv4();
  const job = {
    id: jobId,
    user_id: jobData.userId,
    status: JOB_STATUS.PENDING,
    file_name: jobData.fileName || null,
    file_size: jobData.fileSize || null,
    total_pages: jobData.totalPages || null,
    chunks_total: jobData.chunksTotal || null,
    chunks_processed: 0,
    total_transactions: 0,
    validated_transactions: 0,
    final_transactions: 0,
    progress_percentage: 0.00,
    started_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('processing_jobs')
    .insert([job])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create processing job: ${error.message}`);
  }

  return data;
};

// Update processing job status and progress
const updateProcessingJob = async (jobId, updates) => {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  const updateData = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  // Calculate progress percentage if chunks info is provided
  if (updates.chunks_processed !== undefined && updates.chunks_total !== undefined) {
    updateData.progress_percentage = updates.chunks_total > 0 
      ? (updates.chunks_processed / updates.chunks_total * 100).toFixed(2)
      : 0;
  }

  // Set completed_at timestamp if status is completed or failed
  if (updates.status === JOB_STATUS.COMPLETED || updates.status === JOB_STATUS.FAILED) {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('processing_jobs')
    .update(updateData)
    .eq('id', jobId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update processing job: ${error.message}`);
  }

  return data;
};

// Get processing job by ID (requires userId)
const getProcessingJob = async (jobId, userId) => {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!jobId) {
    throw new Error('Job ID is required');
  }

  const { data, error } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Job not found or doesn't belong to user
    }
    throw new Error(`Failed to get processing job: ${error.message}`);
  }

  return data;
};

// Get processing jobs for a specific user
const getUserProcessingJobs = async (userId, filters = {}) => {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  if (!userId) {
    throw new Error('User ID is required');
  }

  let query = supabase
    .from('processing_jobs')
    .select('*')
    .eq('user_id', userId);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get user processing jobs: ${error.message}`);
  }

  return data;
};

// Get all processing jobs with optional filtering
const getProcessingJobs = async (filters = {}) => {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  let query = supabase.from('processing_jobs').select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get processing jobs: ${error.message}`);
  }

  return data;
};

// Delete old completed jobs (cleanup)
const cleanupOldJobs = async (daysOld = 7) => {
  if (!supabase) {
    return;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { error } = await supabase
    .from('processing_jobs')
    .delete()
    .in('status', [JOB_STATUS.COMPLETED, JOB_STATUS.FAILED])
    .lt('completed_at', cutoffDate.toISOString());

  if (error) {
    console.error('Failed to cleanup old jobs:', error.message);
  }
};

module.exports = {
  JOB_STATUS,
  createProcessingJob,
  updateProcessingJob,
  getProcessingJob,
  getUserProcessingJobs,
  getProcessingJobs,
  cleanupOldJobs
};