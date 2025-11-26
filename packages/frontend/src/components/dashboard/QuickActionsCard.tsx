import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  path: string;
}

export function QuickActionsCard() {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      id: 'chat',
      title: 'Ask AI Tutor',
      description: 'Get instant explanations',
      icon: '💬',
      color: 'bg-blue-500',
      path: '/chat',
    },
    {
      id: 'test',
      title: 'Take a Test',
      description: 'Practice your knowledge',
      icon: '📝',
      color: 'bg-green-500',
      path: '/tests',
    },
    {
      id: 'plan',
      title: 'Learning Plan',
      description: 'View your schedule',
      icon: '📅',
      color: 'bg-purple-500',
      path: '/learning-plan',
    },
    {
      id: 'analytics',
      title: 'View Progress',
      description: 'Check your analytics',
      icon: '📊',
      color: 'bg-orange-500',
      path: '/analytics',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <QuickActionButton
              key={action.id}
              action={action}
              onClick={() => navigate(action.path)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionButtonProps {
  action: QuickAction;
  onClick: () => void;
}

function QuickActionButton({ action, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-center group"
    >
      <div
        className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}
      >
        {action.icon}
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-900">{action.title}</h4>
        <p className="text-xs text-gray-600 mt-0.5">{action.description}</p>
      </div>
    </button>
  );
}
