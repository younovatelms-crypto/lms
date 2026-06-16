import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchAdminPipeline,
  moveAdminPipelineCandidate,
  selectAdminPipeline,
  selectAdminPipelineStatus,
  selectAdminPipelineError,
} from '../../features/admin/adminSlice';

import '../hr/PlacementPipeline.css';

const AdminPlacementPipeline = () => {
  const dispatch = useAppDispatch();

  const pipeline = useAppSelector(selectAdminPipeline);
  const pipelineStatus = useAppSelector(selectAdminPipelineStatus);
  const pipelineError = useAppSelector(selectAdminPipelineError);

  const [filters, setFilters] = useState({ search: '', batch: '', program: '' });
  const [selectedCandidates, setSelectedCandidates] = useState([]);

  const stages = useMemo(
    () => [
      { key: 'enrolled', name: 'Pipeline Eligible', color: '#e3f2fd' },
      { key: 'training', name: 'Profile Review', color: '#f3e5f5' },
      { key: 'ready', name: 'Employer Matched', color: '#e8f5e8' },
      { key: 'interview_scheduled', name: 'Interview Sched.', color: '#fff3e0' },
      { key: 'interview_done', name: 'Interview Done', color: '#fce4ec' },
      { key: 'offer_extended', name: 'Offer Extended', color: '#e0f2f1' },
      { key: 'placed', name: 'Placed', color: '#e8f5e8' },
    ],
    []
  );

  useEffect(() => {
    dispatch(fetchAdminPipeline(filters));
    setSelectedCandidates([]);
  }, [dispatch, filters]);

  const bulkMove = async (targetStage) => {
    if (!selectedCandidates.length) return;

    try {
      await Promise.all(
        selectedCandidates.map((id) =>
          dispatch(
            moveAdminPipelineCandidate({
              candidateId: id,
              stage: targetStage,
              notes: '',
            })
          )
        )
      );

      setSelectedCandidates([]);
      dispatch(fetchAdminPipeline(filters));
    } catch (e) {
      console.error(e);
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
              setSelectedCandidates(
                selectedCandidates.filter((id) => id !== candidate._id)
              );
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
            onChange={(e) => {
              const nextStage = e.target.value;
              dispatch(
                moveAdminPipelineCandidate({
                  candidateId: candidate._id,
                  stage: nextStage,
                  notes: '',
                })
              ).then(() => dispatch(fetchAdminPipeline(filters)));
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Move to...
            </option>
            {stages
              .filter((s) => s.key !== stage)
              .map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
          </select>
        )}
      </div>
    </div>
  );

  if (pipelineStatus === 'loading' && !pipeline) {
    return <div className="loading">Loading admin pipeline...</div>;
  }

  if (pipelineStatus === 'failed') {
    return (
      <div className="loading">
        Failed to load admin pipeline. {pipelineError ? String(pipelineError) : ''}
      </div>
    );
  }

  return (
    <div className="placement-pipeline">
      <div className="pipeline-header">
        <h2>Admin Placement Pipeline</h2>
        <div className="pipeline-stats">
          <span>
            7-Stage Kanban • Admin controls • {pipeline?.total || 0} candidates
          </span>
        </div>
      </div>

      <div className="pipeline-controls">
        <input
          type="text"
          placeholder="Search candidate..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />

        <select
          value={filters.program}
          onChange={(e) => setFilters({ ...filters, program: e.target.value })}
        >
          <option value="">All Program</option>
          <option value="yiep">YIEP</option>
          <option value="yblp">YBLP</option>
        </select>

        <select
          value={filters.batch}
          onChange={(e) => setFilters({ ...filters, batch: e.target.value })}
        >
          <option value="">All Batches</option>
        </select>

        {selectedCandidates.length > 0 && (
          <div className="bulk-actions">
            <span>{selectedCandidates.length} selected</span>
            <select onChange={(e) => bulkMove(e.target.value)} defaultValue="">
              <option value="" disabled>
                Bulk move to...
              </option>
              {stages.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="pipeline-board">
        {stages.map((stage) => (
          <div
            key={stage.key}
            className="pipeline-stage"
            style={{ backgroundColor: stage.color }}
          >
            <div className="stage-header">
              <h3>{stage.name}</h3>
              <span className="stage-count">({pipeline?.stages?.[stage.key]?.count || 0})</span>
            </div>

            <div className="candidates-list">
              {pipeline?.stages?.[stage.key]?.candidates?.map((candidate) => (
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

export default AdminPlacementPipeline;

