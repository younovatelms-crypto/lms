import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchAdminInterviews,
  scheduleAdminInterview,
  saveAdminInterviewOutcome,
  deleteAdminInterview,
} from '../../features/admin/adminSlice';
import { selectAdminInterviews, selectAdminInterviewsStatus } from '../../features/admin/adminSlice';
import './Interviews.css';

const AdminInterviews = () => {
  const dispatch = useAppDispatch();

  const interviews = useAppSelector(selectAdminInterviews);
  const interviewsStatus = useAppSelector(selectAdminInterviewsStatus);

  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');

  const [formData, setFormData] = useState({
    type: 'hr',
    employer: '',
    date: '',
    time: '',
    mode: 'Virtual (Google Meet)',
    meetingLink: '',
  });

  const [selectedInterview, setSelectedInterview] = useState(null);

  const [outcome, setOutcome] = useState({
    result: 'passed',
    notes: '',
    followUpAction: 'Move to Offer Extended',
    followUpDate: '',
  });

  const loading = interviewsStatus === 'loading' || interviewsStatus === 'idle';

  useEffect(() => {
    // Admin-side interview list
    dispatch(fetchAdminInterviews());

    // Candidate list (same as HR: placement ready trainees)
    // If you later want a different admin source, adjust this endpoint.
    const fetchCandidates = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/hr/trainees?placementStatus=ready', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setCandidates(data.trainees || []);
      } catch (e) {
        console.error('Failed to fetch candidates:', e);
      }
    };

    fetchCandidates();
  }, [dispatch]);

  const upcoming = useMemo(
    () => (interviews || []).filter((i) => i.status === 'scheduled'),
    [interviews]
  );

  const handleSchedule = async (e) => {
    e.preventDefault();

    if (!selectedCandidate || !formData.employer || !formData.date || !formData.time) {
      toast.error('Please fill all required fields');
      return;
    }

    const toastId = toast.loading('Scheduling interview...');

    const scheduledAt = new Date(`${formData.date}T${formData.time}`);

    try {
      const payload = {
        traineeId: selectedCandidate,
        type: formData.type,
        scheduledAt,
        interviewerName: formData.employer,
        meetingLink: formData.meetingLink,
        // backend stores meetingLink/notes; mode can be used by UI later via notes if needed
        notes: `Mode: ${formData.mode}`,
      };

      const resultAction = await dispatch(scheduleAdminInterview(payload));
      if (scheduleAdminInterview.fulfilled.match(resultAction)) {
        toast.success('Interview scheduled successfully!', { id: toastId });
        dispatch(fetchAdminInterviews());
        setFormData({ type: 'hr', employer: '', date: '', time: '', mode: 'Virtual (Google Meet)', meetingLink: '' });
        setSelectedCandidate('');
      } else {
        const msg = resultAction.payload?.message || 'Failed to schedule';
        toast.error(msg, { id: toastId });
      }
    } catch {
      toast.error('Network error', { id: toastId });
    }
  };

  const handleSaveOutcome = async () => {
    if (!selectedInterview || !outcome.notes.trim()) {
      toast.error('Please fill interviewer notes');
      return;
    }

    const toastId = toast.loading('Saving outcome...');

    try {
      const interviewId = selectedInterview._id;

      const update = {
        status: 'completed',
        outcome: outcome.result,
        feedback: outcome.notes,
        // nextStep / completedAt are optional fields in schema
        nextStep: outcome.followUpAction,
        completedAt: new Date(),
      };

      const resultAction = await dispatch(saveAdminInterviewOutcome({ interviewId, update }));

      if (saveAdminInterviewOutcome.fulfilled.match(resultAction)) {
        toast.success('Outcome saved successfully!', { id: toastId });
        dispatch(fetchAdminInterviews());
        setSelectedInterview(null);
        setOutcome({ result: 'passed', notes: '', followUpAction: 'Move to Offer Extended', followUpDate: '' });
      } else {
        const msg = resultAction.payload?.message || 'Failed to save';
        toast.error(msg, { id: toastId });
      }
    } catch {
      toast.error('Network error', { id: toastId });
    }
  };

  const handleDelete = async () => {
    if (!selectedInterview) return;

    const ok = window.confirm('Delete this interview?');
    if (!ok) return;

    const toastId = toast.loading('Deleting interview...');
    try {
      const resultAction = await dispatch(deleteAdminInterview(selectedInterview._id));
      if (deleteAdminInterview.fulfilled.match(resultAction)) {
        toast.success('Interview deleted', { id: toastId });
        dispatch(fetchAdminInterviews());
        setSelectedInterview(null);
      } else {
        toast.error(resultAction.payload?.message || 'Failed to delete', { id: toastId });
      }
    } catch {
      toast.error('Network error', { id: toastId });
    }
  };

  return (
    <div className="interview-scheduling">
      <div className="page-header">
        <h2>Interview Scheduling</h2>
      </div>

      <div className="page-subheader">
        <h3>Interview Scheduling & Management</h3>
        <p className="subtitle">Schedule, track, and log interview outcomes</p>
      </div>

      <div className="interview-layout">
        {/* Left Column - Schedule Interview */}
        <div className="schedule-section">
          <h4>Schedule Interview</h4>

          <form onSubmit={handleSchedule}>
            <div className="form-group">
              <label>Candidate</label>
              <select
                value={selectedCandidate}
                onChange={(e) => setSelectedCandidate(e.target.value)}
                required
              >
                <option value="">Select candidate</option>
                {candidates.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} — {c.email} · Score {c.hrEvaluation?.overallScore || 'N/A'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Interview Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="hr">HR</option>
                <option value="technical">Technical</option>
                <option value="final">Final</option>
                <option value="client">Client</option>
                <option value="mock">Mock</option>
              </select>
            </div>

            <div className="form-group">
              <label>Employer / Interviewer</label>
              <input
                type="text"
                placeholder="Infosys BPO — HR Panel"
                value={formData.employer}
                onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Mode</label>
              <select value={formData.mode} onChange={(e) => setFormData({ ...formData, mode: e.target.value })}>
                <option>Virtual (Google Meet)</option>
                <option>Virtual (Zoom)</option>
                <option>In-Person</option>
                <option>Phone Call</option>
              </select>
            </div>

            <div className="form-group">
              <label>Meeting Link</label>
              <input
                type="text"
                placeholder="https://meet.google.com/... (optional)"
                value={formData.meetingLink}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-schedule">
              Schedule Interview
            </button>
          </form>

          <div className="upcoming-interviews">
            <h4>Upcoming Interviews {loading ? '' : ''}</h4>
            <table>
              <thead>
                <tr>
                  <th>CANDIDATE</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((interview) => (
                  <tr key={interview._id} onClick={() => setSelectedInterview(interview)}>
                    <td>
                      <div className="candidate-name">{interview.trainee?.name || 'N/A'}</div>
                      <div className="candidate-meta">{interview.trainee?.email}</div>
                    </td>
                    <td>
                      {interview.scheduledAt
                        ? new Date(interview.scheduledAt).toLocaleString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td>
                      <span className="status-badge scheduled">Scheduled</span>
                    </td>
                  </tr>
                ))}

                {upcoming.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                      No scheduled interviews.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Log Outcome */}
        <div className="outcome-section">
          <h4>Log Outcome — {selectedInterview?.trainee?.name || 'Select Interview'}</h4>

          {selectedInterview ? (
            <>
              <div className="candidate-summary">
                <h5>
                  {selectedInterview.trainee?.name} — {selectedInterview.trainee?.email}
                </h5>
                <p>
                  Score: {selectedInterview.trainee?.hrEvaluation?.overallScore || 'N/A'} · Interview Type: {selectedInterview.type}
                </p>
                <div className="tags">
                  <span className="tag blue">{selectedInterview.type?.toUpperCase() || 'INTERVIEW'}</span>
                  <span className="tag green">Scheduled</span>
                </div>
              </div>

              <div className="form-group">
                <label>Outcome</label>
                <select value={outcome.result} onChange={(e) => setOutcome({ ...outcome, result: e.target.value })}>
                  <option value="passed">Cleared</option>
                  <option value="failed">Rejected</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>

              <div className="form-group">
                <label>Interviewer Notes</label>
                <textarea
                  rows="4"
                  placeholder="Strong communication, good domain knowledge. Recommended for offer extension."
                  value={outcome.notes}
                  onChange={(e) => setOutcome({ ...outcome, notes: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Follow-up Action</label>
                <select value={outcome.followUpAction} onChange={(e) => setOutcome({ ...outcome, followUpAction: e.target.value })}>
                  <option>Move to Offer Extended</option>
                  <option>Schedule Next Round</option>
                  <option>Move to Placed</option>
                  <option>No Action</option>
                </select>
              </div>

              <div className="form-group">
                <label>Follow-up Date</label>
                <input
                  type="date"
                  value={outcome.followUpDate}
                  onChange={(e) => setOutcome({ ...outcome, followUpDate: e.target.value })}
                />
              </div>

              <button className="btn-save-outcome" type="button" onClick={handleSaveOutcome}>
                Save Outcome → Pipeline
              </button>

              <div style={{ height: 12 }} />

              <button
                className="btn-schedule"
                type="button"
                onClick={handleDelete}
                style={{ background: '#b91c1c' }}
              >
                Delete Interview
              </button>
            </>
          ) : (
            <div className="empty-state">Select an interview to log outcome</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminInterviews;

