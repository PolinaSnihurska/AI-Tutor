import { useState } from 'react';
import { Card, CardContent, Button } from '../../components/ui';
import { useNavigate } from 'react-router-dom';

interface FavoriteTopic {
  id: string;
  name: string;
  subject: string;
  description: string;
  studyCount: number;
  lastStudied: Date;
  mastery: number;
}

export function FavoriteTopicsPage() {
  const navigate = useNavigate();
  const [filterSubject, setFilterSubject] = useState<string>('all');

  // Mock data - in real app, fetch from API
  const topics: FavoriteTopic[] = [
    {
      id: '1',
      name: 'Quadratic Equations',
      subject: 'Mathematics',
      description: 'Solving equations of the form ax² + bx + c = 0',
      studyCount: 12,
      lastStudied: new Date(Date.now() - 86400000),
      mastery: 85,
    },
    {
      id: '2',
      name: 'Photosynthesis',
      subject: 'Biology',
      description: 'The process by which plants convert light energy into chemical energy',
      studyCount: 8,
      lastStudied: new Date(Date.now() - 172800000),
      mastery: 72,
    },
    {
      id: '3',
      name: "Newton's Laws",
      subject: 'Physics',
      description: 'Three fundamental laws of motion',
      studyCount: 15,
      lastStudied: new Date(Date.now() - 259200000),
      mastery: 90,
    },
  ];

  const filteredTopics = topics.filter((topic) => {
    if (filterSubject !== 'all' && topic.subject !== filterSubject) return false;
    return true;
  });

  const subjects = Array.from(new Set(topics.map((t) => t.subject)));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Favorite Topics</h1>
          <p className="text-gray-600 mt-2">
            Topics you've marked as favorites for quick access
          </p>
        </div>

        {/* Filter */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Subject:</label>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Topics Grid */}
        {filteredTopics.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">⭐</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No favorite topics yet
              </h2>
              <p className="text-gray-600 mb-6">
                Mark topics as favorites to quickly access them later
              </p>
              <Button onClick={() => navigate('/chat')}>
                Start Learning
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredTopics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TopicCardProps {
  topic: FavoriteTopic;
}

function TopicCard({ topic }: TopicCardProps) {
  const navigate = useNavigate();

  const masteryColor =
    topic.mastery >= 80
      ? 'text-green-600'
      : topic.mastery >= 60
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">{topic.name}</h3>
              <button className="text-yellow-500 hover:text-yellow-600">
                ⭐
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-2">{topic.subject}</p>
            <p className="text-sm text-gray-700">{topic.description}</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Mastery Level</span>
            <span className={`font-semibold ${masteryColor}`}>{topic.mastery}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                topic.mastery >= 80
                  ? 'bg-green-500'
                  : topic.mastery >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${topic.mastery}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <span>📚 Studied {topic.studyCount} times</span>
          <span>📅 {formatRelativeTime(topic.lastStudied)}</span>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/chat?topic=${encodeURIComponent(topic.name)}`)}
          >
            Study Now
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/tests?topic=${encodeURIComponent(topic.name)}`)}
          >
            Take Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}
