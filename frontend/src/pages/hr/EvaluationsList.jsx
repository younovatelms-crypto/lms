// src/pages/hr/EvaluationsList.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './EvaluationsList.css';

const EvaluationsList = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '' });

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/hr/trainees', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setCandidates(data.trainees || []);
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchSearch = !filters.search || 
      c.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      c.email?.toLowerCase().includes(filters.search.toLowerCase());
    const matchStatus = !filters.status || c.placementStatus === filters.status;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="loading">Loading candidates...</div>;

  return (
    <div className="evaluations-list">
      <div className="page-header">
        <div>
          <h2>Candidate Evaluation</h2>
          <p className="subtitle">6-Dimension HR Evaluation · Select candidate to evaluate</p>
        </div>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search candidate by name or email..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          className="search-input"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="enrolled">Pipeline Eligible</option>
          <option value="training">Profile Review</option>
          <option value="ready">Employer Matched</option>
          <option value="interview_scheduled">Interview Scheduled</option>
          <option value="interview_done">Interview Done</option>
          <option value="offer_extended">Offer Extended</option>
          <option value="placed">Placed</option>
        </select>
      </div>

      <div className="candidates-grid">
        {filteredCandidates.length === 0 ? (
          <div className="no-data">No candidates found</div>
        ) : (
          filteredCandidates.map((candidate) => (
            <div key={candidate._id} className="candidate-card-eval">
              <div className="candidate-info">
                <div className="candidate-avatar">
                  {candidate.name?.charAt(0).toUpperCase()}
                </div>
                <div className="candidate-details">
                  <h3>{candidate.name}</h3>
                  <p className="email">{candidate.email}</p>
                  <div className="meta">
                    <span className="batch">{candidate.batchId?.name || 'No Batch'}</span>
                    {candidate.hrEvaluation?.overallScore && (
                      <span className="score">Score: {candidate.hrEvaluation.overallScore}%</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="candidate-actions">
                {candidate.hrEvaluation?.overallScore ? (
                  <div className="evaluated-badge">
                    <span className="badge-icon">✓</span>
                    <span>Evaluated</span>
                  </div>
                ) : (
                  <div className="pending-badge">Pending Evaluation</div>
                )}
                <button
                  onClick={() => navigate(`/hr/evaluation/${candidate._id}`)}
                  className="evaluate-btn"
                >
                  {candidate.hrEvaluation?.overallScore ? 'View/Edit' : 'Evaluate'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EvaluationsList;
