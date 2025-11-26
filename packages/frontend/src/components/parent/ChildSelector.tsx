import { ChildProfile } from '@ai-tutor/shared-types';

interface ChildSelectorProps {
  children: ChildProfile[];
  selectedChildId: string | null;
  onSelectChild: (childId: string) => void;
  isLoading?: boolean;
}

export function ChildSelector({
  children,
  selectedChildId,
  onSelectChild,
  isLoading = false,
}: ChildSelectorProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600">No children linked to your account.</p>
        <p className="text-sm text-gray-500 mt-2">
          Link a child account to start monitoring their progress.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Child
      </label>
      <select
        value={selectedChildId || ''}
        onChange={(e) => onSelectChild(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Select a child...</option>
        {children.map((child) => (
          <option key={child.id} value={child.id}>
            {child.name} - Grade {child.grade}
          </option>
        ))}
      </select>
    </div>
  );
}
