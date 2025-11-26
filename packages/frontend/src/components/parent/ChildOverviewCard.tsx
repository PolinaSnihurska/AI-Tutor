import { ChildProfile } from '@ai-tutor/shared-types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';

interface ChildOverviewCardProps {
  child: ChildProfile;
  onViewDetails: (childId: string) => void;
}

export function ChildOverviewCard({ child, onViewDetails }: ChildOverviewCardProps) {
  const formatLastActive = (date: Date) => {
    const now = new Date();
    const lastActive = new Date(date);
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      return `${diffDays} days ago`;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <CardTitle>{child.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Age:</span>
            <span className="font-medium">{child.age} years</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Grade:</span>
            <span className="font-medium">{child.grade}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subjects:</span>
            <span className="font-medium">{child.subjects.length}</span>
          </div>
          {child.examTarget && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Exam Target:</span>
              <span className="font-medium">{child.examTarget}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Last Active:</span>
            <span className="font-medium text-blue-600">
              {formatLastActive(child.lastActive)}
            </span>
          </div>
          <button
            onClick={() => onViewDetails(child.id)}
            className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Details
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
