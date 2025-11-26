import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { useNavigate } from 'react-router-dom';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number;
  total?: number;
}

export function AchievementsCard() {
  const navigate = useNavigate();

  // Mock achievements - in real app, fetch from API
  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'First Steps',
      description: 'Complete your first test',
      icon: '🎯',
      unlockedAt: new Date(),
    },
    {
      id: '2',
      title: 'Week Warrior',
      description: 'Study for 7 consecutive days',
      icon: '🔥',
      progress: 3,
      total: 7,
    },
    {
      id: '3',
      title: 'Perfect Score',
      description: 'Get 100% on any test',
      icon: '⭐',
    },
  ];

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Achievements</CardTitle>
          <span className="text-sm text-gray-500">
            {unlockedCount}/{achievements.length} unlocked
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {achievements.slice(0, 3).map((achievement) => (
            <AchievementItem key={achievement.id} achievement={achievement} />
          ))}
        </div>
        <button
          className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          onClick={() => navigate('/cabinet/achievements')}
        >
          View All Achievements →
        </button>
      </CardContent>
    </Card>
  );
}

interface AchievementItemProps {
  achievement: Achievement;
}

function AchievementItem({ achievement }: AchievementItemProps) {
  const isUnlocked = !!achievement.unlockedAt;
  const hasProgress = achievement.progress !== undefined && achievement.total !== undefined;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg ${
        isUnlocked ? 'bg-blue-50' : 'bg-gray-50'
      }`}
    >
      <div
        className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
          isUnlocked ? 'bg-blue-100' : 'bg-gray-200 grayscale opacity-50'
        }`}
      >
        {achievement.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-medium ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
          {achievement.title}
        </h4>
        <p className="text-xs text-gray-600 mt-0.5">{achievement.description}</p>
        {hasProgress && !isUnlocked && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>
                {achievement.progress}/{achievement.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{
                  width: `${((achievement.progress || 0) / (achievement.total || 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
        {isUnlocked && achievement.unlockedAt && (
          <p className="text-xs text-blue-600 mt-1">
            Unlocked {formatDate(achievement.unlockedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}
