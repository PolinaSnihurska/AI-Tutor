-- Create subjects table for managing curriculum structure
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  topics JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_subjects_name ON subjects(name);

-- Insert some default subjects
INSERT INTO subjects (name, description, topics) VALUES
('Mathematics', 'Mathematical concepts and problem solving', '[
  {"id": "algebra", "name": "Algebra", "description": "Algebraic expressions and equations", "subtopics": ["Linear Equations", "Quadratic Equations", "Polynomials"]},
  {"id": "geometry", "name": "Geometry", "description": "Shapes, angles, and spatial reasoning", "subtopics": ["Triangles", "Circles", "Area and Perimeter"]},
  {"id": "calculus", "name": "Calculus", "description": "Derivatives and integrals", "subtopics": ["Limits", "Derivatives", "Integrals"]}
]'::jsonb),
('Physics', 'Physical laws and phenomena', '[
  {"id": "mechanics", "name": "Mechanics", "description": "Motion and forces", "subtopics": ["Kinematics", "Dynamics", "Energy"]},
  {"id": "electricity", "name": "Electricity", "description": "Electric circuits and fields", "subtopics": ["Current", "Voltage", "Resistance"]}
]'::jsonb),
('Chemistry', 'Chemical reactions and properties', '[
  {"id": "organic", "name": "Organic Chemistry", "description": "Carbon-based compounds", "subtopics": ["Hydrocarbons", "Functional Groups"]},
  {"id": "inorganic", "name": "Inorganic Chemistry", "description": "Non-carbon compounds", "subtopics": ["Acids and Bases", "Salts"]}
]'::jsonb),
('Biology', 'Living organisms and life processes', '[
  {"id": "cell", "name": "Cell Biology", "description": "Cell structure and function", "subtopics": ["Cell Membrane", "Organelles", "Cell Division"]},
  {"id": "genetics", "name": "Genetics", "description": "Heredity and DNA", "subtopics": ["DNA Structure", "Inheritance", "Mutations"]}
]'::jsonb);
