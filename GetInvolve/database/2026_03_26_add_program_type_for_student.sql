-- Add program_type column for YUVA Student Program role
-- This allows differentiating between NCWEB, DUSOL, and IGNOU students

ALTER TABLE admin_users 
ADD COLUMN program_type VARCHAR(50);

-- Add check constraint to validate program type values
ALTER TABLE admin_users 
ADD CONSTRAINT check_program_type_valid 
CHECK (program_type IS NULL OR program_type IN ('NCWEB', 'DUSOL', 'IGNOU'));

-- Create index for efficient filtering by program type
CREATE INDEX idx_student_by_program_type 
ON admin_users(program_type) 
WHERE role = 'yuva_student_program';

-- Add comment for documentation
COMMENT ON COLUMN admin_users.program_type IS 'Program type for YUVA Student Program role: NCWEB (Delhi University Non-Collegiate Women), DUSOL (Delhi University School of Open Learning), IGNOU (Indira Gandhi National Open University)';
