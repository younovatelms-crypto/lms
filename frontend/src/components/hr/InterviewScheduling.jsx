import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import './InterviewScheduling.css';

const InterviewScheduling = () => {
  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [formData, setFormData] = useState({
    employer: '',
    date: '',
    time: '',
    mode: 'Virtual (Google Meet)'
  });
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [outcome, setOutcome] = useState({
    result: 'Cleared',
    notes: '',
    followUpAction: 'Move to Offer Extended',
    followUpDate: ''
  });

  useEffect(() => {
    fetchCandidates();
    fetchInterviews();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/hr/trainees?placementStatus=ready', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setCandidates(data.trainees || []);
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    }
  };

  const fetchInterviews = async () => {
    try {
      const res = await fetch('/api/hr/interviews', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setInterviews(data.interviews || []);
    } catch (err) {
      console.error('Failed to fetch interviews:', err);
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!selectedCandidate || !formData.employer || !formData.date || !formData.time) {
      toast.error('Please fill all required fields');
      return;
    }

    const toastId = toast.loading('Scheduling interview...');
    try {
      const scheduledAt = new Date(`${formData.date}T${formData.time}`);
      const res = await fetch('/api/hr/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          traineeId: selectedCandidate,
          type: 'placement',
          scheduledAt,
          interviewerName: formData.employer,
          mode: formData.mode,
          status: 'scheduled'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Interview scheduled successfully!', { id: toastId });
        fetchInterviews();
        setFormData({ employer: '', date: '', time: '', mode: 'Virtual (Google Meet)' });
        setSelectedCandidate('');
      } else {
        toast.error(data.message || 'Failed to schedule', { id: toastId });
      }
    } catch (err) {
      toast.error('Network error', { id: toastId });
    }
  };

  const handleSaveOutcome = async () => {
    if (!selectedInterview || !outcome.notes) {
      toast.error('Please fill interviewer notes');
      return;
    }

    const toastId = toast.loading('Saving outcome...');
    try {
      const res = await fetch(`/api/hr/interviews/${selectedInterview._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'completed',
          outcome: outcome.result,
          feedback: outcome.notes,
          completedAt: new Date()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Outcome saved successfully!', { id: toastId });
        fetchInterviews();
        setSelectedInterview(null);
      } else {
        toast.error(data.message || 'Failed to save', { id: toastId });
      }
    } catch (err) {
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
                {candidates.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name} — {c.email} · Score {c.hrEvaluation?.overallScore || 'N/A'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Employer / Interviewer</label>
              <input
                type="text"
                placeholder="Infosys BPO — HR Panel"
                value={formData.employer}
                onChange={(e) => setFormData({...formData, employer: e.target.value})}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Mode</label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({...formData, mode: e.target.value})}
              >
                <option>Virtual (Google Meet)</option>
                <option>Virtual (Zoom)</option>
                <option>In-Person</option>
                <option>Phone Call</option>
              </select>
            </div>

            <button type="submit" className="btn-schedule">Schedule Interview</button>
          </form>

          {/* Upcoming Interviews Table */}
          <div className="upcoming-interviews">
            <h4>Upcoming Interviews</h4>
            <table>
              <thead>
                <tr>
                  <th>CANDIDATE</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {interviews.filter(i => i.status === 'scheduled').map(interview => (
                  <tr key={interview._id} onClick={() => setSelectedInterview(interview)}>
                    <td>
                      <div className="candidate-name">{interview.trainee?.name || 'N/A'}</div>
                      <div className="candidate-meta">{interview.trainee?.email}</div>
                    </td>
                    <td>{new Date(interview.scheduledAt).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</td>
                    <td><span className="status-badge scheduled">Scheduled</span></td>
                  </tr>
                ))}
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
                <h5>{selectedInterview.trainee?.name} — {selectedInterview.trainee?.email}</h5>
                <p>Score: {selectedInterview.trainee?.hrEvaluation?.overallScore || 'N/A'} · Placement Ready · Interview: {selectedInterview.interviewerName}</p>
                <div className="tags">
                  <span className="tag blue">YIEP</span>
                  <span className="tag green">Placement Ready</span>
                </div>
              </div>

              <div className="form-group">
                <label>Outcome</label>
                <select
                  value={outcome.result}
                  onChange={(e) => setOutcome({...outcome, result: e.target.value})}
                >
                  <option>Cleared</option>
                  <option>Rejected</option>
                  <option>On Hold</option>
                  <option>Rescheduled</option>
                </select>
              </div>

              <div className="form-group">
                <label>Interviewer Notes</label>
                <textarea
                  rows="4"
                  placeholder="Strong communication, good domain knowledge. Recommended for offer extension."
                  value={outcome.notes}
                  onChange={(e) => setOutcome({...outcome, notes: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Follow-up Action</label>
                <select
                  value={outcome.followUpAction}
                  onChange={(e) => setOutcome({...outcome, followUpAction: e.target.value})}
                >
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
                  onChange={(e) => setOutcome({...outcome, followUpDate: e.target.value})}
                />
              </div>

              <button className="btn-save-outcome" onClick={handleSaveOutcome}>
                Save Outcome → Pipeline
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

export default InterviewScheduling;
