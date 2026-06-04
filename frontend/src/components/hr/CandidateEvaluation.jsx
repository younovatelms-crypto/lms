import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './CandidateEvaluation.css';

const CandidateEvaluation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [scores, setScores] = useState({
    communication: 5,
    technical: 5,
    problemSolving: 5,
    attitude: 5,
    learningAgility: 5,
    operationalReadiness: 5
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  const dimensions = [
    { key: 'communication', label: 'D1 — Communication Skills', desc: 'Clarity, fluency, confidence' },
    { key: 'technical', label: 'D2 — Technical Knowledge', desc: 'Domain-relevant knowledge' },
    { key: 'problemSolving', label: 'D3 — Problem Solving', desc: 'Logical thinking, case scenarios' },
    { key: 'attitude', label: 'D4 — Professional Attitude', desc: 'Punctuality, presentation' },
    { key: 'learningAgility', label: 'D5 — Learning Agility', desc: 'Adaptability, uptake speed' },
    { key: 'operationalReadiness', label: 'D6 — Operational Readiness', desc: 'Day-1 role readiness' }
  ];

  useEffect(() => {
    if (id) fetchCandidate();
    else setLoading(false);
  }, [id]);

  const fetchCandidate = async () => {
    try {
      const res = await fetch(`/api/hr/trainees/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setCandidate(data.data);
        if (data.data.hrEvaluation) {
          setScores({
            communication: Math.round((data.data.hrEvaluation.communication || 50) / 10),
            technical: Math.round((data.data.hrEvaluation.technical || 50) / 10),
            problemSolving: Math.round((data.data.hrEvaluation.problemSolving || 50) / 10),
            attitude: Math.round((data.data.hrEvaluation.attitude || 50) / 10),
            learningAgility: Math.round((data.data.hrEvaluation.learningAgility || 50) / 10),
            operationalReadiness: Math.round((data.data.hrEvaluation.operationalReadiness || 50) / 10)
          });
          setNotes(data.data.hrEvaluation.evaluationNotes || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch candidate:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateCompositeScore = () => {
    const values = Object.values(scores);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    return Math.round((avg / 10) * 100);
  };

  const getClassification = (score) => {
    if (score >= 85) return { label: 'Outstanding', color: '#4caf50' };
    if (score >= 70) return { label: 'Proficient', color: '#2196f3' };
    if (score >= 55) return { label: 'Developing', color: '#ff9800' };
    return { label: 'Not Yet', color: '#f44336' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id) {
      toast.error('Please select a candidate from the evaluations list');
      return;
    }
    
    const toastId = toast.loading('Submitting evaluation...');
    
    try {
      const res = await fetch('/api/hr/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          traineeId: id,
          communication: scores.communication * 10,
          technical: scores.technical * 10,
          problemSolving: scores.problemSolving * 10,
          attitude: scores.attitude * 10,
          learningAgility: scores.learningAgility * 10,
          operationalReadiness: scores.operationalReadiness * 10,
          confidence: scores.problemSolving * 10,
          overallScore: calculateCompositeScore(),
          evaluationNotes: notes,
          recommendation: getClassification(calculateCompositeScore()).label
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Evaluation submitted successfully! 🎉', { id: toastId });
        setTimeout(() => navigate('/hr/evaluations'), 1500);
      } else {
        toast.error(data.message || 'Failed to submit evaluation', { id: toastId });
      }
    } catch (err) {
      console.error('Failed to submit evaluation:', err);
      toast.error('Network error. Please try again.', { id: toastId });
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  
  const compositeScore = calculateCompositeScore();
  const classification = getClassification(compositeScore);

  return (
    <div className="candidate-evaluation">
      <div className="eval-header">
        <h2>Candidate Evaluation</h2>
      </div>

      <div className="eval-subheader">
        <h3>Candidate Evaluation Form</h3>
        <p className="candidate-info">
          6-Dimension HR Evaluation {candidate ? `· ${candidate.name} · ${candidate.email}` : ''}
        </p>
      </div>

      <div className="eval-content">
        <div className="eval-form">
          <h4>Evaluation Dimensions</h4>
          
          {dimensions.map((dim) => (
            <div key={dim.key} className="dimension-row">
              <div className="dimension-info">
                <label>{dim.label}</label>
                <span className="dimension-desc">{dim.desc}</span>
              </div>
              <div className="dimension-slider">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={scores[dim.key]}
                  onChange={(e) => setScores({...scores, [dim.key]: parseInt(e.target.value)})}
                />
                <span className="score-value">{scores[dim.key]}</span>
              </div>
            </div>
          ))}

          <div className="evaluator-notes">
            <label>Evaluator Notes</label>
            <textarea
              rows="4"
              placeholder="Outstanding candidate. Strong communication and operational readiness. Highly recommended."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button className="submit-btn" onClick={handleSubmit}>
            Submit Evaluation → Lock
          </button>
        </div>

        <div className="live-score">
          <h4>Live Composite Score</h4>
          <div className="score-display">
            <div className="score-number" style={{ color: classification.color }}>
              {compositeScore}%
            </div>
            <div className="score-label" style={{ color: classification.color }}>
              {classification.label}
            </div>
          </div>
          <div className="classification-info">
            <p className="classification-label">Classification:</p>
            <p className="classification-ranges">
              Outstanding ≥ 85 · Proficient 70–84<br/>
              Developing 55–69 · Not Yet &lt;55
            </p>
            <div className="progress-bar" style={{ background: classification.color }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateEvaluation;
