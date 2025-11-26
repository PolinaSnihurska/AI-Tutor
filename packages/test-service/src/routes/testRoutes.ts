import { Router, Request, Response } from 'express';
import { testService } from '../services/testService';
import { testSubmissionService } from '../services/testSubmissionService';
import { adaptiveQuestioningService } from '../services/adaptiveQuestioningService';
import { z } from 'zod';

const router = Router();

// Validation schemas
const generateTestSchema = z.object({
  subject: z.string().min(1).max(100),
  topics: z.array(z.string()).min(1).max(10),
  difficulty: z.number().int().min(1).max(10),
  questionCount: z.number().int().min(1).max(50),
  questionTypes: z.array(z.enum(['multiple_choice', 'true_false', 'open_ended'])).optional(),
  studentLevel: z.number().int().min(1).max(12).optional(),
});

const submitTestSchema = z.object({
  testId: z.string(),
  studentId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.union([z.string(), z.array(z.string())]),
  })),
  startTime: z.string().transform(str => new Date(str)),
  endTime: z.string().transform(str => new Date(str)),
});

// Generate a new test using AI
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const params = generateTestSchema.parse(req.body);
    
    const test = await testService.generateTest(params);
    
    res.status(201).json(test);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: error.errors,
      });
    }
    
    console.error('Error generating test:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Failed to generate test',
    });
  }
});

// Get a test by ID (without answers for students taking the test)
router.get('/:testId', async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const { includeAnswers } = req.query;
    
    // In production, check if user is admin/teacher for includeAnswers
    if (includeAnswers === 'true') {
      const test = await testService.getTest(testId);
      return res.json(test);
    }
    
    const test = await testService.getTestWithoutAnswers(testId);
    res.json(test);
  } catch (error) {
    console.error('Error getting test:', error);
    
    if (error instanceof Error && error.message === 'Test not found') {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Test not found',
      });
    }
    
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get test',
    });
  }
});

// Submit test answers
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const submission = submitTestSchema.parse(req.body);
    
    const result = await testSubmissionService.submitTest(submission);
    
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid submission data',
        details: error.errors,
      });
    }
    
    console.error('Error submitting test:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Failed to submit test',
    });
  }
});

// Get test history for a student
router.get('/history/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    const tests = await testService.getTestHistory(studentId, limit);
    
    res.json(tests);
  } catch (error) {
    console.error('Error getting test history:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get test history',
    });
  }
});

// Get test results for a student
router.get('/results/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const testId = req.query.testId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    const results = await testSubmissionService.getStudentResults(studentId, {
      testId,
      limit,
    });
    
    res.json(results);
  } catch (error) {
    console.error('Error getting test results:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get test results',
    });
  }
});

// Get a specific test result
router.get('/result/:resultId', async (req: Request, res: Response) => {
  try {
    const { resultId } = req.params;
    
    const result = await testSubmissionService.getTestResult(resultId);
    
    res.json(result);
  } catch (error) {
    console.error('Error getting test result:', error);
    
    if (error instanceof Error && error.message === 'Test result not found') {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Test result not found',
      });
    }
    
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get test result',
    });
  }
});

// Search tests
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      subject: req.query.subject as string | undefined,
      topics: req.query.topics ? (req.query.topics as string).split(',') : undefined,
      difficulty: req.query.difficulty ? parseInt(req.query.difficulty as string) : undefined,
      createdBy: req.query.createdBy as 'ai' | 'admin' | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };
    
    const tests = await testService.searchTests(filters);
    
    res.json(tests);
  } catch (error) {
    console.error('Error searching tests:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to search tests',
    });
  }
});

// Generate adaptive test
router.post('/adaptive/generate', async (req: Request, res: Response) => {
  try {
    const { studentId, subject, topics, questionCount } = req.body;

    if (!studentId || !subject || !topics || !questionCount) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: studentId, subject, topics, questionCount',
      });
    }

    const questions = await adaptiveQuestioningService.generateAdaptiveTest(
      studentId,
      subject,
      topics,
      questionCount
    );

    // Create a test with the adaptive questions
    const test = await testService.createTest({
      title: `Adaptive ${subject} Test`,
      subject,
      topics,
      questions,
      timeLimit: questionCount * 2, // 2 minutes per question
      passingScore: 70,
      createdBy: 'ai',
    });

    res.status(201).json(test);
  } catch (error) {
    console.error('Error generating adaptive test:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Failed to generate adaptive test',
    });
  }
});

// Get next adaptive question
router.post('/adaptive/next-question', async (req: Request, res: Response) => {
  try {
    const { studentId, subject, topics } = req.body;

    if (!studentId || !subject || !topics) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: studentId, subject, topics',
      });
    }

    const question = await adaptiveQuestioningService.getNextQuestion(
      studentId,
      subject,
      topics
    );

    res.json(question);
  } catch (error) {
    console.error('Error getting next adaptive question:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Failed to get next question',
    });
  }
});

export default router;
