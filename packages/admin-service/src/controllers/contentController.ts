import { Response } from 'express';
import { AdminRequest } from '../middleware/adminAuth';
import { Content } from '../models/Content';
import { z } from 'zod';

// Validation schemas
const TestQuestionSchema = z.object({
  subject: z.string().min(1),
  topic: z.string().min(1),
  type: z.enum(['multiple_choice', 'true_false', 'open_ended']),
  content: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  explanation: z.string().min(1),
  difficulty: z.number().min(1).max(5),
  points: z.number().min(1),
});

const ContentItemSchema = z.object({
  subject: z.string().min(1),
  topic: z.string().min(1),
  subtopic: z.string().optional(),
  content: z.string().min(1),
  difficulty: z.number().min(1).max(5),
  examples: z.array(z.any()).default([]),
  relatedTopics: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

const PromptTemplateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['explanation', 'test_generation', 'learning_plan']),
  template: z.string().min(1),
  variables: z.array(z.string()),
  description: z.string().min(1),
  isActive: z.boolean().default(true),
  version: z.number().default(1),
});

const SubjectSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  topics: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      subtopics: z.array(z.string()),
    })
  ),
});

// Test Questions
export const getTestQuestions = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const filters = {
      subject: req.query.subject as string,
      topic: req.query.topic as string,
      difficulty: req.query.difficulty ? parseInt(req.query.difficulty as string) : undefined,
    };

    const result = await Content.getTestQuestions(page, limit, filters);

    res.json({
      questions: result.questions,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('Get test questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTestQuestion = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const data = TestQuestionSchema.parse(req.body);
    const id = await Content.createTestQuestion({
      ...data,
      createdBy: req.admin!.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({ id, message: 'Test question created successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create test question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTestQuestion = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = TestQuestionSchema.partial().parse(req.body);

    await Content.updateTestQuestion(id, data);

    res.json({ message: 'Test question updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update test question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTestQuestion = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await Content.deleteTestQuestion(id);

    res.json({ message: 'Test question deleted successfully' });
  } catch (error) {
    console.error('Delete test question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Content Library
export const getContentLibrary = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const filters = {
      subject: req.query.subject as string,
      topic: req.query.topic as string,
    };

    const result = await Content.getContentLibrary(page, limit, filters);

    res.json({
      items: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('Get content library error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createContentItem = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const data = ContentItemSchema.parse(req.body);
    const id = await Content.createContentItem({
      ...data,
      createdBy: req.admin!.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({ id, message: 'Content item created successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create content item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateContentItem = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = ContentItemSchema.partial().parse(req.body);

    await Content.updateContentItem(id, data);

    res.json({ message: 'Content item updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update content item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteContentItem = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await Content.deleteContentItem(id);

    res.json({ message: 'Content item deleted successfully' });
  } catch (error) {
    console.error('Delete content item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// AI Prompt Templates
export const getPromptTemplates = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const type = req.query.type as string;
    const templates = await Content.getPromptTemplates(type);

    res.json({ templates });
  } catch (error) {
    console.error('Get prompt templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPromptTemplate = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const data = PromptTemplateSchema.parse(req.body);
    const id = await Content.createPromptTemplate({
      ...data,
      createdBy: req.admin!.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({ id, message: 'Prompt template created successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create prompt template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePromptTemplate = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = PromptTemplateSchema.partial().parse(req.body);

    await Content.updatePromptTemplate(id, data);

    res.json({ message: 'Prompt template updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update prompt template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePromptTemplate = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await Content.deletePromptTemplate(id);

    res.json({ message: 'Prompt template deleted successfully' });
  } catch (error) {
    console.error('Delete prompt template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Subjects and Topics
export const getSubjects = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const subjects = await Content.getSubjects();
    res.json({ subjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSubject = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const data = SubjectSchema.parse(req.body);
    const id = await Content.createSubject(data);

    res.status(201).json({ id, message: 'Subject created successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSubject = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = SubjectSchema.partial().parse(req.body);

    await Content.updateSubject(id, data);

    res.json({ message: 'Subject updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSubject = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await Content.deleteSubject(id);

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
