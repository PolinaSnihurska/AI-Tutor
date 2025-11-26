import { useState } from 'react';
import { Card, CardContent } from '../../components/ui';

interface SavedMaterial {
  id: string;
  type: 'explanation' | 'example' | 'note';
  title: string;
  subject: string;
  topic: string;
  content: string;
  savedAt: Date;
  tags: string[];
}

export function SavedMaterialsPage() {
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - in real app, fetch from API
  const materials: SavedMaterial[] = [
    {
      id: '1',
      type: 'explanation',
      title: 'Quadratic Equations',
      subject: 'Mathematics',
      topic: 'Algebra',
      content: 'A quadratic equation is a second-order polynomial equation...',
      savedAt: new Date(Date.now() - 86400000),
      tags: ['algebra', 'equations'],
    },
    {
      id: '2',
      type: 'example',
      title: 'Photosynthesis Process',
      subject: 'Biology',
      topic: 'Plant Biology',
      content: 'Photosynthesis is the process by which plants convert light energy...',
      savedAt: new Date(Date.now() - 172800000),
      tags: ['plants', 'energy'],
    },
  ];

  const filteredMaterials = materials.filter((material) => {
    if (filterSubject !== 'all' && material.subject !== filterSubject) return false;
    if (searchQuery && !material.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const subjects = Array.from(new Set(materials.map((m) => m.subject)));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Saved Materials</h1>
          <p className="text-gray-600 mt-2">
            Access your bookmarked explanations and notes
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search materials..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Materials Grid */}
        {filteredMaterials.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">📑</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No saved materials
              </h2>
              <p className="text-gray-600">
                Save explanations and notes as you learn to access them later
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMaterials.map((material) => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface MaterialCardProps {
  material: SavedMaterial;
}

function MaterialCard({ material }: MaterialCardProps) {
  const typeConfig = {
    explanation: { icon: '💡', color: 'bg-purple-100 text-purple-800' },
    example: { icon: '📝', color: 'bg-blue-100 text-blue-800' },
    note: { icon: '📌', color: 'bg-green-100 text-green-800' },
  };

  const config = typeConfig[material.type];

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="py-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
              {material.title}
            </h3>
            <p className="text-sm text-gray-600">
              {material.subject} • {material.topic}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-3 line-clamp-3">{material.content}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {material.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Saved {formatRelativeTime(material.savedAt)}</span>
          <button className="text-red-600 hover:text-red-700">Remove</button>
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
