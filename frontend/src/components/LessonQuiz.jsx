import React, { useState, useEffect, useRef } from "react";
import { API_BASE } from "../config";

function LessonQuiz({ lessonId, onQuizPassed, onClose }) {
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false);
    const retryTimer = useRef(null);

    useEffect(() => {
        fetchQuiz();
        return () => {
            if (retryTimer.current) {
                clearTimeout(retryTimer.current);
            }
        };
    }, [lessonId]);

    const fetchQuiz = async () => {
        try {
            setLoading(true);
            setGenerating(false);
            const res = await fetch(`${API_BASE}/learning/lessons/${lessonId}/quiz/`, {
                credentials: 'include',
            });

            if (res.status === 202) {
                const data = await res.json();
                setGenerating(true);
                setError(data.error || 'Quiz is being generated. Please wait...');
                if (retryTimer.current) {
                    clearTimeout(retryTimer.current);
                }
                retryTimer.current = setTimeout(() => {
                    fetchQuiz();
                }, 3000);
                return;
            }

            if (res.ok) {
                const data = await res.json();
                setQuiz(data);
            } else {
                const errorData = await res.json();
                setError(errorData.error || 'Quiz not available');
            }
        } catch (err) {
            console.error('Error fetching quiz:', err);
            setError('Failed to load quiz');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (questionId, answerId) => {
        setAnswers({
            ...answers,
            [questionId]: answerId,
        });
    };

    const handleSubmit = async () => {
        // Check if all questions are answered
        const unanswered = quiz.questions.filter(q => !answers[q.id]);
        if (unanswered.length > 0) {
            alert(`Please answer all questions. ${unanswered.length} question(s) remaining.`);
            return;
        }

        try {
            setLoading(true);

            // Format answers for API
            const formattedAnswers = quiz.questions.map(q => ({
                question_id: q.id,
                answer_id: answers[q.id],
            }));

            const res = await fetch(`${API_BASE}/learning/quizzes/${quiz.quiz_id}/submit/`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: formattedAnswers }),
            });

            if (res.ok) {
                const data = await res.json();
                setResult(data);
                setSubmitted(true);

                // If passed and lesson completed, call parent callback
                if (data.passed && data.lesson_completed) {
                    setTimeout(() => {
                        onQuizPassed(data.progress_percent);
                    }, 3000); // Give them time to see results
                }
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.error || 'Failed to submit quiz'}`);
            }
        } catch (err) {
            console.error('Error submitting quiz:', err);
            alert('Error submitting quiz');
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        setAnswers({});
        setSubmitted(false);
        setResult(null);
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Loading quiz...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: generating ? '#0f766e' : '#ef4444', marginBottom: '1rem' }}>{error}</p>
                <button
                    onClick={onClose}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: '#6b7280',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                    }}
                >
                    Close
                </button>
            </div>
        );
    }

    if (!quiz) {
        return null;
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            {/* Quiz Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    {quiz.title}
                </h2>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                    {quiz.description}
                </p>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
                    <span>📝 {quiz.total_questions} Questions</span>
                    <span>📊 Passing Score: {quiz.passing_score}%</span>
                </div>
            </div>

            {/* Questions */}
            {!submitted ? (
                <div>
                    {quiz.questions.map((question, idx) => (
                        <div
                            key={question.id}
                            style={{
                                background: '#f9fafb',
                                padding: '1.5rem',
                                borderRadius: '0.5rem',
                                marginBottom: '1.5rem',
                                border: '1px solid #e5e7eb',
                            }}
                        >
                            <p style={{ fontWeight: 600, marginBottom: '1rem' }}>
                                {idx + 1}. {question.question_text}
                            </p>

                            {question.options.map((option) => (
                                <label
                                    key={option.id}
                                    style={{
                                        display: 'block',
                                        padding: '0.75rem',
                                        marginBottom: '0.5rem',
                                        background: answers[question.id] === option.id ? '#dbeafe' : '#fff',
                                        border: answers[question.id] === option.id ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                        borderRadius: '0.375rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name={`question-${question.id}`}
                                        value={option.id}
                                        checked={answers[question.id] === option.id}
                                        onChange={() => handleAnswerSelect(question.id, option.id)}
                                        style={{ marginRight: '0.5rem' }}
                                    />
                                    {option.answer_text}
                                </label>
                            ))}
                        </div>
                    ))}

                    {/* Submit Button */}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: '#6b7280',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                opacity: loading ? 0.6 : 1,
                            }}
                        >
                            {loading ? 'Submitting...' : 'Submit Quiz'}
                        </button>
                    </div>
                </div>
            ) : (
                /* Results */
                <div style={{ textAlign: 'center' }}>
                    <div
                        style={{
                            padding: '2rem',
                            background: result.passed ? '#d1fae5' : '#fee2e2',
                            borderRadius: '1rem',
                            marginBottom: '2rem',
                        }}
                    >
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                            {result.passed ? '🎉' : '😔'}
                        </div>
                        <h3 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            {result.passed ? 'Congratulations!' : 'Not Quite'}
                        </h3>
                        <p style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                            Score: {Math.round(result.score)}% ({result.points_earned}/{result.total_points} points)
                        </p>
                        <p style={{ color: '#6b7280' }}>
                            {result.passed
                                ? `You passed! (Required: ${result.passing_score}%)`
                                : `You need ${result.passing_score}% to pass. Keep trying!`
                            }
                        </p>
                        {result.lesson_completed && (
                            <p style={{ color: '#10b981', fontWeight: 600, marginTop: '1rem' }}>
                                ✅ Lesson marked as complete!
                            </p>
                        )}
                    </div>

                    {/* Show Results */}
                    <details style={{ marginBottom: '2rem', textAlign: 'left' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '1rem' }}>
                            View Detailed Results
                        </summary>
                        {result.results.map((r, idx) => (
                            <div
                                key={r.question_id}
                                style={{
                                    padding: '1rem',
                                    background: r.is_correct ? '#d1fae5' : '#fee2e2',
                                    borderRadius: '0.5rem',
                                    marginBottom: '1rem',
                                }}
                            >
                                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                                    {idx + 1}. {r.question_text}
                                </p>
                                <p style={{ marginBottom: '0.5rem' }}>
                                    {r.is_correct ? '✅ Correct!' : '❌ Incorrect'}
                                </p>
                                {r.explanation && (
                                    <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                                        💡 {r.explanation}
                                    </p>
                                )}
                            </div>
                        ))}
                    </details>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        {!result.passed && (
                            <button
                                onClick={handleRetry}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: '#3b82f6',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                🔄 Retry Quiz
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: '#6b7280',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LessonQuiz;
