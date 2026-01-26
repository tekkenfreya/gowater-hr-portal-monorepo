-- Create attendance_edit_requests table
-- Date: 2026-01-14
-- Purpose: Store attendance time edit requests for admin approval
-- Based on leave_requests pattern from existing schema

CREATE TABLE IF NOT EXISTS attendance_edit_requests (
  id SERIAL PRIMARY KEY,
  attendance_id INTEGER NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Original times (snapshot for audit trail)
  original_check_in_time TIMESTAMP WITH TIME ZONE,
  original_check_out_time TIMESTAMP WITH TIME ZONE,
  original_break_start_time TIMESTAMP WITH TIME ZONE,
  original_break_end_time TIMESTAMP WITH TIME ZONE,

  -- Requested new times (null means no change requested for that field)
  requested_check_in_time TIMESTAMP WITH TIME ZONE,
  requested_check_out_time TIMESTAMP WITH TIME ZONE,
  requested_break_start_time TIMESTAMP WITH TIME ZONE,
  requested_break_end_time TIMESTAMP WITH TIME ZONE,

  -- Request details
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Review details (following leave_requests pattern)
  approver_id INTEGER REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_edit_requests_user_id ON attendance_edit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_edit_requests_attendance_id ON attendance_edit_requests(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_edit_requests_status ON attendance_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_attendance_edit_requests_created_at ON attendance_edit_requests(created_at DESC);
