import { Router } from 'express';
import {
  getTestQuestions,
  createTestQuestion,
  updateTestQuestion,
  deleteTestQuestion,
  getContentLibrary,
  createContentItem,
  updateContentItem,
  deleteContentItem,
  getPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/contentController';
import { authenticateAdmin } from '../middleware/adminAuth';

const router = Router();

// All routes require authentication
router.use(authenticateAdmin);

// Test Questions
router.get('/questions', getTestQuestions);
router.post('/questions', createTestQuestion);
router.put('/questions/:id', updateTestQuestion);
router.delete('/questions/:id', deleteTestQuestion);

// Content Library
router.get('/library', getContentLibrary);
router.post('/library', createContentItem);
router.put('/library/:id', updateContentItem);
router.delete('/library/:id', deleteContentItem);

// AI Prompt Templates
router.get('/prompts', getPromptTemplates);
router.post('/prompts', createPromptTemplate);
router.put('/prompts/:id', updatePromptTemplate);
router.delete('/prompts/:id', deletePromptTemplate);

// Subjects and Topics
router.get('/subjects', getSubjects);
router.post('/subjects', createSubject);
router.put('/subjects/:id', updateSubject);
router.delete('/subjects/:id', deleteSubject);

export default router;
