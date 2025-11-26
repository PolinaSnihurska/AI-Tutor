import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
}

export const KnowledgeBaseSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_SUPPORT_SERVICE_URL}/api/kb/search`,
        {
          params: { q: searchQuery },
        }
      );
      setResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadArticle = async (slug: string) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_SUPPORT_SERVICE_URL}/api/kb/${slug}`
      );
      setSelectedArticle(response.data);
    } catch (error) {
      console.error('Failed to load article:', error);
    }
  };

  const submitFeedback = async (helpful: boolean) => {
    if (!selectedArticle) return;

    try {
      await axios.post(
        `${process.env.REACT_APP_SUPPORT_SERVICE_URL}/api/kb/${selectedArticle.id}/feedback`,
        { helpful }
      );
      alert('Thank you for your feedback!');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  if (selectedArticle) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedArticle(null)}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to search
        </button>

        <article className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-4">{selectedArticle.title}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-6">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              {selectedArticle.category}
            </span>
            <span>{selectedArticle.views} views</span>
          </div>

          <div
            className="prose max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
          />

          <div className="border-t pt-6">
            <p className="text-gray-700 mb-4">Was this article helpful?</p>
            <div className="flex space-x-4">
              <button
                onClick={() => submitFeedback(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
                <span>Yes ({selectedArticle.helpfulCount})</span>
              </button>
              <button
                onClick={() => submitFeedback(false)}
                className="flex items-center space-x-2 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                  />
                </svg>
                <span>No ({selectedArticle.notHelpfulCount})</span>
              </button>
            </div>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Search Knowledge Base</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for help articles..."
            className="flex-1 border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Search Results</h3>
          {results.map((article) => (
            <div
              key={article.id}
              onClick={() => loadArticle(article.slug)}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
            >
              <h4 className="font-semibold text-lg mb-2">{article.title}</h4>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {article.category}
                </span>
                <span>{article.views} views</span>
                <span>
                  {article.helpfulCount} found helpful
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && searchQuery && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-600">No articles found. Try a different search term.</p>
        </div>
      )}
    </div>
  );
};

export const PopularArticles: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopularArticles();
  }, []);

  const fetchPopularArticles = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_SUPPORT_SERVICE_URL}/api/kb/popular`
      );
      setArticles(response.data);
    } catch (error) {
      console.error('Failed to fetch popular articles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Popular Articles</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((article) => (
          <div
            key={article.id}
            className="bg-white border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
          >
            <h4 className="font-semibold mb-2">{article.title}</h4>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <span>{article.views} views</span>
              <span>•</span>
              <span>{article.helpfulCount} helpful</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
