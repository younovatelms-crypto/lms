import React, { useState, useEffect } from 'react';
import './PlacementPipeline.css';

const PlacementPipeline = () => {
  const [pipeline, setPipeline] = useState({});
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({ search: '', batch: '', program: '' });
  const [loading, setLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState([]);

  const stages = [
    { key: 'enrolled', name: 'Pipeline Eligible', color: '#e3f2fd' },
    { key: 'training', name: 'Profile Review', color: '#f3e5f5' },
    { key: 'ready', name: 'Employer Matched', color: '#e8f5e8' },
    { key: 'interview_scheduled', name: 'Interview Sched.', color: '#fff3e0' },
    { key: 'interview_done', name: 'Interview Done', color: '#fce4ec' },
    { key: 'offer_extended', name: 'Offer Extended', color: '#e0f2f1' },
    { key: 'placed', name: 'Placed', color: '#e8f5e8' }
  ];

  useEffect(() => {
    fetchPipeline();
    fetchStats();
  }, [filters]);

  const fetchPipeline = async () => {
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await fetch(`/api/hr/pipeline?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setPipeline(data.pipeline);
    } catch (err) {
      console.error('Failed to fetch pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/hr/pipeline/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const moveCandidate = async (candidateId, targetStage, notes = '') => {
    try {
      const res = await fetch(`/api/hr/pipeline/${candidateId}/stage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ stage: targetStage, notes })
      });
      const data = await res.json();
      if (data.success) {
        fetchPipeline();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to move candidate:', err);
    }
  };

  const bulkMove = async (targetStage) => {
    if (!selectedCandidates.length) return;
    try {
      const res = await fetch('/api/hr/bulk-move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ candidateIds: selectedCandidates, targetStage })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedCandidates([]);
        fetchPipeline();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to bulk move:', err);
    }
  };

  const CandidateCard = ({ candidate, stage }) => (
    <div className="candidate-card" key={candidate._id}>
      <div className="candidate-header">
        <input
          type="checkbox"
          checked={selectedCandidates.includes(candidate._id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedCandidates([...selectedCandidates, candidate._id]);
            } else {
              setSelectedCandidates(selectedCandidates.filter(id => id !== candidate._id));
            }
          }}
        />
        <h4>{candidate.name}</h4>
      </div>
      <div className="candidate-details">
        {candidate.score > 0 && (
          <div className="score-badge">{candidate.score}</div>
        )}
        <p className="batch">{candidate.batch}</p>
        {candidate.companyName && <p className="company">{candidate.companyName}</p>}
      </div>
      <div className="candidate-actions">
        {stage !== 'placed' && (
          <select 
            onChange={(e) => moveCandidate(candidate._id, e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Move to...</option>
            {stages.filter(s => s.key !== stage).map(s => (
              <option key={s.key} value={s.key}>{s.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );

  if (loading) return <div className="loading">Loading pipeline...</div>;

  return (
    <div className="placement-pipeline">
      <div className="pipeline-header">
        <h2>Placement Pipeline</h2>
        <div className="pipeline-stats">
          <span>7-Stage Kanban • Auto-entry at score ≥ 60 • {stats.total || 0} candidates</span>
        </div>
      </div>

      <div className="pipeline-controls">
        <input
          type="text"
          placeholder="Search candidate..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
        />
        <select
          value={filters.program}
          onChange={(e) => setFilters({...filters, program: e.target.value})}
        >
          <option value="">All Program</option>
          <option value="yiep">YIEP</option>
          <option value="yblp">YBLP</option>
        </select>
        <select
          value={filters.batch}
          onChange={(e) => setFilters({...filters, batch: e.target.value})}
        >
          <option value="">All Batches</option>
        </select>
        {selectedCandidates.length > 0 && (
          <div className="bulk-actions">
            <span>{selectedCandidates.length} selected</span>
            <select onChange={(e) => bulkMove(e.target.value)} defaultValue="">
              <option value="" disabled>Bulk move to...</option>
              {stages.map(s => (
                <option key={s.key} value={s.key}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="pipeline-board">
        {stages.map(stage => (
          <div key={stage.key} className="pipeline-stage" style={{backgroundColor: stage.color}}>
            <div className="stage-header">
              <h3>{stage.name}</h3>
              <span className="stage-count">
                ({pipeline.stages?.[stage.key]?.count || 0})
              </span>
            </div>
            <div className="candidates-list">
              {pipeline.stages?.[stage.key]?.candidates?.map(candidate => (
                <CandidateCard 
                  key={candidate._id} 
                  candidate={candidate} 
                  stage={stage.key} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlacementPipeline;