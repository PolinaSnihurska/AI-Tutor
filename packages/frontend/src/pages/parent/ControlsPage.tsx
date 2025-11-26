import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parentApi, ParentalControls } from '../../lib/api';
import { Loading, ErrorMessage, Card, CardHeader, CardTitle, CardContent, useToast } from '../../components/ui';

export function ControlsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get('childId');

  const [formData, setFormData] = useState<Partial<ParentalControls>>({
    dailyTimeLimitMinutes: null,
    contentRestrictions: [],
    allowedSubjects: null,
    blockedFeatures: [],
    active: true,
  });

  useEffect(() => {
    if (!childId) {
      navigate('/parent/dashboard');
    }
  }, [childId, navigate]);

  const {
    data: controls,
    isLoading,
    error,
  } = useQuery<ParentalControls>({
    queryKey: ['parent', 'controls', childId],
    queryFn: () => parentApi.getParentalControls(childId!),
    enabled: !!childId,
  });

  useEffect(() => {
    if (controls) {
      setFormData(controls);
    }
  }, [controls]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ParentalControls>) =>
      parentApi.updateParentalControls(childId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent', 'controls', childId] });
      showToast('success', 'Parental controls updated successfully');
    },
    onError: () => {
      showToast('error', 'Failed to update parental controls');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleToggleRestriction = (restriction: string) => {
    setFormData((prev) => ({
      ...prev,
      contentRestrictions: prev.contentRestrictions?.includes(restriction)
        ? prev.contentRestrictions.filter((r) => r !== restriction)
        : [...(prev.contentRestrictions || []), restriction],
    }));
  };

  const handleToggleFeature = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      blockedFeatures: prev.blockedFeatures?.includes(feature)
        ? prev.blockedFeatures.filter((f) => f !== feature)
        : [...(prev.blockedFeatures || []), feature],
    }));
  };

  if (!childId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorMessage message="Failed to load parental controls. Please try again." />
      </div>
    );
  }

  const availableRestrictions = ['social', 'games', 'videos', 'external_links'];
  const availableFeatures = ['chat', 'forums', 'messaging', 'file_sharing'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/parent/dashboard')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Parental Controls</h1>
          <p className="text-gray-600 mt-2">
            Manage time limits, content restrictions, and feature access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Active Status */}
          <Card>
            <CardHeader>
              <CardTitle>Control Status</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, active: e.target.checked }))
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">
                    Enable Parental Controls
                  </span>
                  <p className="text-sm text-gray-600">
                    Turn on to enforce time limits and restrictions
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Time Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Time Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.dailyTimeLimitMinutes || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dailyTimeLimitMinutes: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    placeholder="No limit"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Leave empty for no daily limit
                  </p>
                </div>
                {formData.dailyTimeLimitMinutes && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Daily limit set to{' '}
                      <span className="font-semibold">
                        {Math.floor(formData.dailyTimeLimitMinutes / 60)}h{' '}
                        {formData.dailyTimeLimitMinutes % 60}m
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content Restrictions */}
          <Card>
            <CardHeader>
              <CardTitle>Content Access Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Select content types to restrict
                </p>
                {availableRestrictions.map((restriction) => (
                  <label
                    key={restriction}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.contentRestrictions?.includes(restriction)}
                      onChange={() => handleToggleRestriction(restriction)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-900 capitalize">
                      {restriction.replace(/_/g, ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Blocked Features */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Restrictions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Select features to block
                </p>
                {availableFeatures.map((feature) => (
                  <label
                    key={feature}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.blockedFeatures?.includes(feature)}
                      onChange={() => handleToggleFeature(feature)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-900 capitalize">
                      {feature.replace(/_/g, ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/parent/dashboard')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
