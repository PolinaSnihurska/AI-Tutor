import pool from '../db/connection';

export interface KBArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  tags: string[];
  authorId: string;
  status: 'draft' | 'published' | 'archived';
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export class KnowledgeBaseModel {
  static async create(data: {
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
    authorId: string;
  }): Promise<KBArticle> {
    const query = `
      INSERT INTO kb_articles (title, slug, content, category, tags, author_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      data.title,
      data.slug,
      data.content,
      data.category,
      data.tags,
      data.authorId,
    ];
    const result = await pool.query(query, values);
    return this.mapToArticle(result.rows[0]);
  }

  static async findById(id: string): Promise<KBArticle | null> {
    const query = 'SELECT * FROM kb_articles WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? this.mapToArticle(result.rows[0]) : null;
  }

  static async findBySlug(slug: string): Promise<KBArticle | null> {
    const query = 'SELECT * FROM kb_articles WHERE slug = $1 AND status = $2';
    const result = await pool.query(query, [slug, 'published']);
    if (result.rows[0]) {
      // Increment view count
      await pool.query('UPDATE kb_articles SET views = views + 1 WHERE id = $1', [
        result.rows[0].id,
      ]);
    }
    return result.rows[0] ? this.mapToArticle(result.rows[0]) : null;
  }

  static async search(query: string, category?: string): Promise<KBArticle[]> {
    let sql = `
      SELECT * FROM kb_articles 
      WHERE status = 'published' 
      AND (title ILIKE $1 OR content ILIKE $1 OR $2 = ANY(tags))
    `;
    const values: any[] = [`%${query}%`, query];

    if (category) {
      sql += ' AND category = $3';
      values.push(category);
    }

    sql += ' ORDER BY views DESC, helpful_count DESC LIMIT 20';

    const result = await pool.query(sql, values);
    return result.rows.map(this.mapToArticle);
  }

  static async findByCategory(category: string): Promise<KBArticle[]> {
    const query = `
      SELECT * FROM kb_articles 
      WHERE category = $1 AND status = 'published'
      ORDER BY views DESC, helpful_count DESC
    `;
    const result = await pool.query(query, [category]);
    return result.rows.map(this.mapToArticle);
  }

  static async getPopular(limit: number = 10): Promise<KBArticle[]> {
    const query = `
      SELECT * FROM kb_articles 
      WHERE status = 'published'
      ORDER BY views DESC, helpful_count DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows.map(this.mapToArticle);
  }

  static async publish(id: string): Promise<KBArticle | null> {
    const query = `
      UPDATE kb_articles 
      SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] ? this.mapToArticle(result.rows[0]) : null;
  }

  static async addFeedback(data: {
    articleId: string;
    userId?: string;
    helpful: boolean;
    comment?: string;
  }): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert feedback
      await client.query(
        `INSERT INTO kb_article_feedback (article_id, user_id, helpful, comment)
         VALUES ($1, $2, $3, $4)`,
        [data.articleId, data.userId, data.helpful, data.comment]
      );

      // Update article counts
      const field = data.helpful ? 'helpful_count' : 'not_helpful_count';
      await client.query(
        `UPDATE kb_articles SET ${field} = ${field} + 1 WHERE id = $1`,
        [data.articleId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(
    id: string,
    data: Partial<{
      title: string;
      content: string;
      category: string;
      tags: string[];
    }>
  ): Promise<KBArticle | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title) {
      fields.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.content) {
      fields.push(`content = $${paramCount++}`);
      values.push(data.content);
    }
    if (data.category) {
      fields.push(`category = $${paramCount++}`);
      values.push(data.category);
    }
    if (data.tags) {
      fields.push(`tags = $${paramCount++}`);
      values.push(data.tags);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE kb_articles 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] ? this.mapToArticle(result.rows[0]) : null;
  }

  private static mapToArticle(row: any): KBArticle {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      category: row.category,
      tags: row.tags || [],
      authorId: row.author_id,
      status: row.status,
      views: row.views,
      helpfulCount: row.helpful_count,
      notHelpfulCount: row.not_helpful_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
    };
  }
}
