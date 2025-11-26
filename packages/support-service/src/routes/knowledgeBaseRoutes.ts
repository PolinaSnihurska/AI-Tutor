import { Router, Request, Response } from 'express';
import { KnowledgeBaseModel } from '../models/KnowledgeBase';

const router = Router();

// Search knowledge base
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, category } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const articles = await KnowledgeBaseModel.search(
      q,
      category as string | undefined
    );
    res.json(articles);
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    res.status(500).json({ error: 'Failed to search knowledge base' });
  }
});

// Get popular articles
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const articles = await KnowledgeBaseModel.getPopular(limit);
    res.json(articles);
  } catch (error) {
    console.error('Error fetching popular articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Get articles by category
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const articles = await KnowledgeBaseModel.findByCategory(category);
    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles by category:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Get article by slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const article = await KnowledgeBaseModel.findBySlug(slug);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// Submit article feedback
router.post('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { helpful, comment } = req.body;
    const userId = (req as any).user?.id;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: 'Helpful field is required' });
    }

    await KnowledgeBaseModel.addFeedback({
      articleId: id,
      userId,
      helpful,
      comment,
    });

    res.json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Create article (admin only)
router.post('/', async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, slug, content, category, tags } = req.body;
    const authorId = (req as any).user.id;

    if (!title || !slug || !content || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const article = await KnowledgeBaseModel.create({
      title,
      slug,
      content,
      category,
      tags: tags || [],
      authorId,
    });

    res.status(201).json(article);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// Update article (admin only)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { title, content, category, tags } = req.body;

    const article = await KnowledgeBaseModel.update(id, {
      title,
      content,
      category,
      tags,
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// Publish article (admin only)
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const article = await KnowledgeBaseModel.publish(id);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    console.error('Error publishing article:', error);
    res.status(500).json({ error: 'Failed to publish article' });
  }
});

export default router;
