import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { testApi, Test } from '../../lib/api/testApi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Modal } from '../../components/ui/Modal';

export function TestBrowserPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    subject: '',
    difficulty: undefined as number | undefined,
  });
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [previewTest, setPreviewTest] = useState<Test | null>(null);

  const { data: tests, isLoading, error } = useQuery({
    queryKey: ['tests', filters],
    queryFn: () => testApi.getTests(filters),
  });

  const handleStartTest = (testId: string) => {
    navigate(`/test/${testId}`);
  };

  const handlePreview = (test: Test) => {
    setPreviewTest(test);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Practice Tests</h1>
          <p className="text-gray-600 mt-2">
            Choose a test to practice or generate a custom one
          </p>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Subjects</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
                <option value="English">English</option>
                <option value="History">History</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={filters.difficulty || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    difficulty: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                <option value="1">Easy (1-3)</option>
                <option value="4">Medium (4-6)</option>
                <option value="7">Hard (7-10)</option>
              </select>
            </div>

            <Button onClick={() => setShowGenerateModal(true)} variant="primary">
              Generate Custom Test
            </Button>
          </div>
        </Card>

        {/* Test List */}
        {isLoading && <Loading />}
        {error && <ErrorMessage message="Failed to load tests. Please try again." />}

        {tests && tests.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No tests found matching your criteria</p>
              <Button onClick={() => setShowGenerateModal(true)}>
                Generate Your First Test
              </Button>
            </div>
          </Card>
        )}

        {tests && tests.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tests.map((test) => (
              <Card key={test.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{test.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Subject:</span>
                      <span className="ml-2">{test.subject}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Questions:</span>
                      <span className="ml-2">{test.questions.length}</span>
                    </div>
                    {test.timeLimit && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium">Time Limit:</span>
                        <span className="ml-2">{test.timeLimit} minutes</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {test.topics.slice(0, 3).map((topic, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                        >
                          {topic}
                        </span>
                      ))}
                      {test.topics.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{test.topics.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleStartTest(test.id)}
                      variant="primary"
                      size="sm"
                      className="flex-1"
                    >
                      Start Test
                    </Button>
                    <Button
                      onClick={() => handlePreview(test)}
                      variant="outline"
                      size="sm"
                    >
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Generate Test Modal */}
        {showGenerateModal && (
          <GenerateTestModal
            isOpen={showGenerateModal}
            onClose={() => setShowGenerateModal(false)}
            onGenerate={(testId) => {
              setShowGenerateModal(false);
              navigate(`/test/${testId}`);
            }}
          />
        )}

        {/* Preview Modal */}
        {previewTest && (
          <TestPreviewModal
            test={previewTest}
            isOpen={!!previewTest}
            onClose={() => setPreviewTest(null)}
            onStart={() => {
              handleStartTest(previewTest.id);
              setPreviewTest(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

interface GenerateTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (testId: string) => void;
}

function GenerateTestModal({ isOpen, onClose, onGenerate }: GenerateTestModalProps) {
  const [formData, setFormData] = useState({
    subject: 'Mathematics',
    topics: [] as string[],
    difficulty: 5,
    questionCount: 10,
    questionTypes: ['multiple_choice'] as Array<'multiple_choice' | 'true_false' | 'open_ended'>,
  });
  const [topicInput, setTopicInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleAddTopic = () => {
    if (topicInput.trim() && !formData.topics.includes(topicInput.trim())) {
      setFormData({
        ...formData,
        topics: [...formData.topics, topicInput.trim()],
      });
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setFormData({
      ...formData,
      topics: formData.topics.filter((t) => t !== topic),
    });
  };

  const handleGenerate = async () => {
    if (formData.topics.length === 0) {
      setError('Please add at least one topic');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/tests/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate test');
      }

      const test = await response.json();
      onGenerate(test.id);
    } catch (err) {
      setError('Failed to generate test. Please try again.');
      setIsGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Custom Test" size="lg">
      <div className="space-y-4">
        {error && <ErrorMessage message={error} />}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject
          </label>
          <select
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Biology">Biology</option>
            <option value="English">English</option>
            <option value="History">History</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Topics
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()}
              placeholder="Enter a topic and press Enter"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handleAddTopic} size="sm">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.topics.map((topic) => (
              <span
                key={topic}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
              >
                {topic}
                <button
                  onClick={() => handleRemoveTopic(topic)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty: {formData.difficulty}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={formData.difficulty}
            onChange={(e) =>
              setFormData({ ...formData, difficulty: parseInt(e.target.value) })
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Easy</span>
            <span>Medium</span>
            <span>Hard</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Questions
          </label>
          <input
            type="number"
            min="5"
            max="50"
            value={formData.questionCount}
            onChange={(e) =>
              setFormData({ ...formData, questionCount: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            variant="primary"
            className="flex-1"
            isLoading={isGenerating}
          >
            Generate Test
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface TestPreviewModalProps {
  test: Test;
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
}

function TestPreviewModal({ test, isOpen, onClose, onStart }: TestPreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Test Preview" size="lg">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{test.title}</h3>
          <p className="text-gray-600 mt-1">{test.subject}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Questions</p>
            <p className="text-2xl font-bold text-gray-900">{test.questions.length}</p>
          </div>
          {test.timeLimit && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Time Limit</p>
              <p className="text-2xl font-bold text-gray-900">{test.timeLimit} min</p>
            </div>
          )}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Passing Score</p>
            <p className="text-2xl font-bold text-gray-900">{test.passingScore}%</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Total Points</p>
            <p className="text-2xl font-bold text-gray-900">
              {test.questions.reduce((sum, q) => sum + q.points, 0)}
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Topics Covered</h4>
          <div className="flex flex-wrap gap-2">
            {test.topics.map((topic, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Question Types</h4>
          <div className="space-y-1">
            {Object.entries(
              test.questions.reduce((acc, q) => {
                acc[q.type] = (acc[q.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <div key={type} className="flex justify-between text-sm">
                <span className="text-gray-600 capitalize">
                  {type.replace('_', ' ')}
                </span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Close
          </Button>
          <Button onClick={onStart} variant="primary" className="flex-1">
            Start Test
          </Button>
        </div>
      </div>
    </Modal>
  );
}
