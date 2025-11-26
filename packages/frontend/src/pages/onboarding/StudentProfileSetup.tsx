import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button, Input, ErrorAlert } from '../../components/ui';
import { OnboardingLayout } from './OnboardingLayout';
import { userApi } from '../../lib/api';
import { handleApiError } from '../../lib/api/client';
import { useAppDispatch } from '../../store';
import { updateProfile } from '../../store/slices/userSlice';

const SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Geography',
  'Computer Science',
  'Literature',
  'Foreign Languages',
];

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export function StudentProfileSetup() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({
    age: '',
    grade: '',
    subjects: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateMutation = useMutation({
    mutationFn: (data: { age: number; grade: number; subjects: string[] }) =>
      userApi.updateProfile(data),
    onSuccess: (updatedProfile) => {
      dispatch(updateProfile(updatedProfile));
      navigate('/onboarding/subscription');
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else if (parseInt(formData.age) < 6 || parseInt(formData.age) > 100) {
      newErrors.age = 'Please enter a valid age';
    }

    if (!formData.grade) {
      newErrors.grade = 'Grade is required';
    }

    if (formData.subjects.length === 0) {
      newErrors.subjects = 'Please select at least one subject';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    updateMutation.mutate({
      age: parseInt(formData.age),
      grade: parseInt(formData.grade),
      subjects: formData.subjects,
    });
  };

  const toggleSubject = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
    // Clear error when user selects a subject
    if (errors.subjects) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.subjects;
        return newErrors;
      });
    }
  };

  const handleSkip = () => {
    navigate('/onboarding/subscription');
  };

  return (
    <OnboardingLayout
      currentStep={0}
      totalSteps={2}
      title="Set up your profile"
      subtitle="Tell us about yourself to personalize your learning experience"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {updateMutation.error && (
          <ErrorAlert message={handleApiError(updateMutation.error)} />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Age"
            type="number"
            name="age"
            min="6"
            max="100"
            value={formData.age}
            onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
            error={errors.age}
            placeholder="15"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grade
            </label>
            <select
              name="grade"
              value={formData.grade}
              onChange={(e) => setFormData((prev) => ({ ...prev, grade: e.target.value }))}
              className={`
                w-full px-3 py-2 border rounded-lg shadow-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${errors.grade ? 'border-red-500' : 'border-gray-300'}
              `}
            >
              <option value="">Select grade</option>
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
            {errors.grade && <p className="mt-1 text-sm text-red-600">{errors.grade}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subjects you want to study
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SUBJECTS.map((subject) => (
              <label
                key={subject}
                className={`
                  flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                  ${
                    formData.subjects.includes(subject)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={formData.subjects.includes(subject)}
                  onChange={() => toggleSubject(subject)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">{subject}</span>
              </label>
            ))}
          </div>
          {errors.subjects && <p className="mt-1 text-sm text-red-600">{errors.subjects}</p>}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            className="flex-1"
          >
            Skip for now
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            isLoading={updateMutation.isPending}
          >
            Continue
          </Button>
        </div>
      </form>
    </OnboardingLayout>
  );
}
