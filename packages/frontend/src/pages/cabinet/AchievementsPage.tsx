import { useState } from 'react';
import { Card, CardContent } from '../../components/ui';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'learning' | 'testing' | 'consistency' | 'mastery';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
  progress?: number;
  total?: number;
  points: number;
}

export function AchievementsPage() {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unlocked' | 'locked'>('all');

  // Mock data - in real app, fetch from API
  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'First Steps',
      description: 'Complete your first test',
      icon: '🎯',
      category: 'testing',
      rarity: 'common',
      unlockedAt: new Date(Date.now() - 86400000 * 7),
      points: 10,
    },
    {
      id: '2',
      title: 'Week Warrior',
      description: 'Study for 7 consecutive days',
      icon: '🔥',
      category: 'consistency',
      rarity: 'rare',
      progress: 5,
      total: 7,
      points: 50,
    },
    {
      id: '3',
      title: 'Perfect Score',
      description: 'Get 100% on any test',
      icon: '⭐',
      category: 'testing',
      rarity: 'epic',
      unlockedAt: new Date(Date.now() - 86400000 * 3),
      points: 100,
    },
    {
      id: '4',
      title: 'Knowledge Seeker',
      description: 'Ask 100 questions to the AI tutor',
      icon: '💡',
      category: 'learning',
      rarity: 'common',
      progress: 45,
      total: 100,
      points: 25,
    },
    {
      id: '5',
      title: 'Master of Mathematics',
      description: 'Achieve 90% mastery in all math topics',
      icon: '🧮',
      category: 'mastery',
      rarity: 'legendary',
      points: 500,
    },
    {
      id: '6',
      title: 'Early Bird',
      description: 'Study before 7 AM for 5 days',
      icon: '🌅',
      category: 'consistency',
      rarity: 'rare',
      progress: 2,
      total: 5,
      points: 75,
    },
  ];

  const filteredAchievements = achievements.filter((achievement) => {
    if (filterCategory !== 'all' && achievement.category !== filterCategory) return false;
    if (filterStatus === 'unlocked' && !achievement.unlockedAt) return false;
    if (filterStatus === 'locked' && achievement.unlockedAt) return false;
    return true;
  });

  const totalPoints = achievements
    .filter((a) => a.unlockedAt)
    .reduce((sum, a) => sum + a.points, 0);
  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Achievements</h1>
          <p className="text-gray-600 mt-2">
            Track your learning milestones and earn rewards
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{unlockedCount}</div>
              <p className="text-sm text-gray-600 mt-1">Achievements Unlocked</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{totalPoints}</div>
              <p className="text-sm text-gray-600 mt-1">Total Points</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                {((unlockedCount / achievements.length) * 100).toFixed(0)}%
              </div>
              <p className="text-sm text-gray-600 mt-1">Completion Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  <option value="learning">Learning</option>
                  <option value="testing">Testing</option>
                  <option value="consistency">Consistency</option>
                  <option value="mastery">Mastery</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="unlocked">Unlocked</option>
                  <option value="locked">Locked</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAchievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
}

function AchievementCard({ achievement }: AchievementCardProps) {
  const isUnlocked = !!achievement.unlockedAt;
  const hasProgress = achievement.progress !== undefined && achievement.total !== undefined;

  const rarityColors = {
    common: 'border-gray-300 bg-gray-50',
    rare: 'border-blue-300 bg-blue-50',
    epic: 'border-purple-300 bg-purple-50',
    legendary: 'border-yellow-300 bg-yellow-50',
  };

  const rarityBadgeColors = {
    common: 'bg-gray-200 text-gray-800',
    rare: 'bg-blue-200 text-blue-800',
    epic: 'bg-purple-200 text-purple-800',
    legendary: 'bg-yellow-200 text-yellow-800',
  };

  return (
    <Card
      className={`border-2 ${rarityColors[achievement.rarity]} ${
        !isUnlocked && 'opacity-60'
      }`}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
              isUnlocked ? 'bg-white shadow-md' : 'bg-gray-200 grayscale'
            }`}
          >
            {achievement.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h3
                className={`text-base font-semibold ${
                  isUnlocked ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {achievement.title}
              </h3>
              <span
                className={`text-xs px-2 py-1 rounded-full ${rarityBadgeColors[achievement.rarity]}`}
              >
                {achievement.rarity}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-yellow-600 font-medium">
                {achievement.points} pts
              </span>
              {isUnlocked && achievement.unlockedAt && (
                <span className="text-gray-500">
                  • Unlocked {formatRelativeTime(achievement.unlockedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {hasProgress && !isUnlocked && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>
                {achievement.progress}/{achievement.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${((achievement.progress || 0) / (achievement.total || 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
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
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}
