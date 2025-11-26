import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { testApi, Question } from '../../lib/api/testApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Modal } from '../../components/ui/Modal';

export function TestTakingPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => (state as any).auth?.user);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [startTime] = useState(new Date());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: test, isLoading, error } = useQuery({
    queryKey: ['test', testId],
    queryFn: () => testApi.getTest(testId!),
    enabled: !!testId,
  });

  // Timer effect
  useEffect(() => {
    if (test?.timeLimit) {
      setTimeRemaining(test.timeLimit * 60); // Convert minutes to seconds
    }
  }, [test]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const currentQuestion = test?.questions[currentQuestionIndex];
  const totalQuestions = test?.questions.length || 0;
  const answeredCount = Object.keys(answers).length;

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleSubmit = useCallback(async () => {
    if (!test || !user?.id) return;

    setIsSubmitting(true);
    try {
      const submission = {
        testId: test.id,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
      };

      const result = await testApi.submitTest(submission);
      navigate(`/test/result/${result.id}`);
    } catch (err) {
      console.error('Failed to submit test:', err);
      setIsSubmitting(false);
    }
  }, [test, user, answers, startTime, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message="Failed to load test" />;
  if (!test) return <ErrorMessage message="Test not found" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
              <p className="text-gray-600">{test.subject}</p>
            </div>
            <div className="text-right">
              {timeRemaining !== null && (
                <div
                  className={`text-2xl font-bold ${
                    timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
                  }`}
                >
                  {formatTime(timeRemaining)}
                </div>
              )}
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>
                {answeredCount} / {totalQuestions} answered
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Display */}
          <div className="lg:col-span-3">
            {currentQuestion && (
              <QuestionCard
                question={currentQuestion}
                questionNumber={currentQuestionIndex + 1}
                answer={answers[currentQuestion.id]}
                onAnswerChange={(answer) =>
                  handleAnswerChange(currentQuestion.id, answer)
                }
              />
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                variant="outline"
              >
                Previous
              </Button>
              <div className="flex gap-3">
                {currentQuestionIndex === totalQuestions - 1 ? (
                  <Button
                    onClick={() => setShowSubmitConfirm(true)}
                    variant="primary"
                  >
                    Submit Test
                  </Button>
                ) : (
                  <Button onClick={handleNext} variant="primary">
                    Next
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Questions</h3>
              <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                {test.questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => handleJumpToQuestion(idx)}
                    className={`
                      w-10 h-10 rounded-lg font-medium text-sm transition-colors
                      ${
                        idx === currentQuestionIndex
                          ? 'bg-blue-600 text-white'
                          : answers[q.id]
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 rounded" />
                  <span className="text-gray-600">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 rounded" />
                  <span className="text-gray-600">Not answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded" />
                  <span className="text-gray-600">Current</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        <Modal
          isOpen={showSubmitConfirm}
          onClose={() => setShowSubmitConfirm(false)}
          title="Submit Test"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to submit your test?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                You have answered {answeredCount} out of {totalQuestions} questions.
                {answeredCount < totalQuestions && (
                  <span className="block mt-1 font-medium">
                    {totalQuestions - answeredCount} questions remain unanswered.
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowSubmitConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Review Answers
              </Button>
              <Button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  handleSubmit();
                }}
                variant="primary"
                className="flex-1"
                isLoading={isSubmitting}
              >
                Submit
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  answer: string | string[] | undefined;
  onAnswerChange: (answer: string | string[]) => void;
}

function QuestionCard({
  question,
  questionNumber,
  answer,
  onAnswerChange,
}: QuestionCardProps) {
  return (
    <Card>
      <div className="mb-4">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
            {questionNumber}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                {question.topic}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                {question.points} {question.points === 1 ? 'point' : 'points'}
              </span>
            </div>
            <p className="text-lg text-gray-900 whitespace-pre-wrap">
              {question.content}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {question.type === 'multiple_choice' && question.options && (
          <MultipleChoiceOptions
            options={question.options}
            selectedAnswer={answer as string}
            onChange={onAnswerChange}
          />
        )}

        {question.type === 'true_false' && (
          <TrueFalseOptions
            selectedAnswer={answer as string}
            onChange={onAnswerChange}
          />
        )}

        {question.type === 'open_ended' && (
          <OpenEndedAnswer
            answer={answer as string}
            onChange={onAnswerChange}
          />
        )}
      </div>
    </Card>
  );
}

interface MultipleChoiceOptionsProps {
  options: string[];
  selectedAnswer: string | undefined;
  onChange: (answer: string) => void;
}

function MultipleChoiceOptions({
  options,
  selectedAnswer,
  onChange,
}: MultipleChoiceOptionsProps) {
  return (
    <div className="space-y-2">
      {options.map((option, idx) => {
        const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D...
        const isSelected = selectedAnswer === option;

        return (
          <button
            key={idx}
            onClick={() => onChange(option)}
            className={`
              w-full text-left p-4 rounded-lg border-2 transition-all
              ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <span
                className={`
                  flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium
                  ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 text-gray-600'
                  }
                `}
              >
                {optionLabel}
              </span>
              <span className="text-gray-900">{option}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface TrueFalseOptionsProps {
  selectedAnswer: string | undefined;
  onChange: (answer: string) => void;
}

function TrueFalseOptions({ selectedAnswer, onChange }: TrueFalseOptionsProps) {
  return (
    <div className="flex gap-4">
      {['True', 'False'].map((option) => {
        const isSelected = selectedAnswer === option;

        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              flex-1 p-4 rounded-lg border-2 font-medium transition-all
              ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }
            `}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

interface OpenEndedAnswerProps {
  answer: string | undefined;
  onChange: (answer: string) => void;
}

function OpenEndedAnswer({ answer, onChange }: OpenEndedAnswerProps) {
  return (
    <textarea
      value={answer || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type your answer here..."
      rows={6}
      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
    />
  );
}
