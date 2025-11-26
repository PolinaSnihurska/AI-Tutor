import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui';
import { useAppSelector } from '../../store';
import { useEffect } from 'react';

export function RoleSelection() {
  const navigate = useNavigate();
  const userProfile = useAppSelector((state) => state.user.profile);

  // If user already has a role set, redirect to appropriate onboarding step
  useEffect(() => {
    if (userProfile?.role === 'student') {
      navigate('/onboarding/student-profile');
    } else if (userProfile?.role === 'parent') {
      navigate('/onboarding/parent-profile');
    }
  }, [userProfile, navigate]);

  const handleRoleSelect = (role: 'student' | 'parent') => {
    if (role === 'student') {
      navigate('/onboarding/student-profile');
    } else {
      navigate('/onboarding/parent-profile');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to AI Tutoring Platform
          </h1>
          <p className="text-xl text-gray-600">
            Let's get you set up. Are you a student or a parent?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleRoleSelect('student')}
          >
            <Card padding="none">
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
                <svg
                  className="w-10 h-10 text-blue-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">I'm a Student</h2>
              <p className="text-gray-600 mb-6">
                Get personalized learning plans, AI-powered explanations, and track your
                progress towards your goals.
              </p>
              <ul className="text-left space-y-2 mb-6">
                <li className="flex items-start text-sm text-gray-700">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  AI tutor for any subject
                </li>
                <li className="flex items-start text-sm text-gray-700">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Personalized learning plans
                </li>
                <li className="flex items-start text-sm text-gray-700">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Practice tests and analytics
                </li>
              </ul>
              <div className="inline-flex items-center text-blue-600 font-medium">
                Get started as a student
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Card>
          </div>

          <div
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleRoleSelect('parent')}
          >
            <Card padding="none">
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-6">
                <svg
                  className="w-10 h-10 text-purple-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">I'm a Parent</h2>
              <p className="text-gray-600 mb-6">
                Monitor your children's learning progress, get insights, and support their
                educational journey.
              </p>
              <ul className="text-left space-y-2 mb-6">
                <li className="flex items-start text-sm text-gray-700">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Monitor up to 3 children
                </li>
                <li className="flex items-start text-sm text-gray-700">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Detailed progress reports
                </li>
                <li className="flex items-start text-sm text-gray-700">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Parental controls & insights
                </li>
              </ul>
              <div className="inline-flex items-center text-purple-600 font-medium">
                Get started as a parent
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
