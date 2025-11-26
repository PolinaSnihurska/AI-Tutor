import React, { useState } from 'react';
import { FileText, Brain, BookOpen, FolderTree } from 'lucide-react';

type ContentTab = 'questions' | 'library' | 'prompts' | 'subjects';

export const ContentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ContentTab>('questions');

  const tabs = [
    { id: 'questions' as ContentTab, name: 'Test Questions', icon: FileText },
    { id: 'library' as ContentTab, name: 'Content Library', icon: BookOpen },
    { id: 'prompts' as ContentTab, name: 'AI Prompts', icon: Brain },
    { id: 'subjects' as ContentTab, name: 'Subjects & Topics', icon: FolderTree },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-600 mt-2">Manage test questions, learning materials, and AI prompts</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'questions' && <TestQuestionsTab />}
          {activeTab === 'library' && <ContentLibraryTab />}
          {activeTab === 'prompts' && <AIPromptsTab />}
          {activeTab === 'subjects' && <SubjectsTab />}
        </div>
      </div>
    </div>
  );
};

const TestQuestionsTab: React.FC = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Test Questions</h2>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Add Question
        </button>
      </div>
      <div className="text-gray-600">
        <p>Manage test questions for different subjects and difficulty levels.</p>
        <ul className="mt-4 space-y-2 list-disc list-inside">
          <li>Create multiple choice, true/false, and open-ended questions</li>
          <li>Set difficulty levels and point values</li>
          <li>Organize by subject and topic</li>
          <li>Add explanations for correct answers</li>
        </ul>
      </div>
    </div>
  );
};

const ContentLibraryTab: React.FC = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Content Library</h2>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Add Content
        </button>
      </div>
      <div className="text-gray-600">
        <p>Manage learning materials and educational content.</p>
        <ul className="mt-4 space-y-2 list-disc list-inside">
          <li>Create lesson content for different topics</li>
          <li>Add examples and practice problems</li>
          <li>Link related topics</li>
          <li>Tag content for easy discovery</li>
        </ul>
      </div>
    </div>
  );
};

const AIPromptsTab: React.FC = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">AI Prompt Templates</h2>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Add Template
        </button>
      </div>
      <div className="text-gray-600">
        <p>Manage AI prompt templates for different use cases.</p>
        <ul className="mt-4 space-y-2 list-disc list-inside">
          <li>Create templates for explanations, test generation, and learning plans</li>
          <li>Define variables and placeholders</li>
          <li>Version control for prompt iterations</li>
          <li>A/B test different prompt variations</li>
        </ul>
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Template Types:</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• <strong>Explanation:</strong> Templates for topic explanations</li>
            <li>• <strong>Test Generation:</strong> Templates for creating test questions</li>
            <li>• <strong>Learning Plan:</strong> Templates for personalized study plans</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const SubjectsTab: React.FC = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Subjects & Topics</h2>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Add Subject
        </button>
      </div>
      <div className="text-gray-600">
        <p>Manage the curriculum structure and topic hierarchy.</p>
        <ul className="mt-4 space-y-2 list-disc list-inside">
          <li>Define subjects (Mathematics, Physics, etc.)</li>
          <li>Create topics within each subject</li>
          <li>Add subtopics for detailed organization</li>
          <li>Maintain curriculum alignment</li>
        </ul>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Mathematics</h3>
            <p className="text-sm text-gray-600">Algebra, Geometry, Calculus</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Physics</h3>
            <p className="text-sm text-gray-600">Mechanics, Electricity, Thermodynamics</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Chemistry</h3>
            <p className="text-sm text-gray-600">Organic, Inorganic, Physical</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Biology</h3>
            <p className="text-sm text-gray-600">Cell Biology, Genetics, Ecology</p>
          </div>
        </div>
      </div>
    </div>
  );
};
