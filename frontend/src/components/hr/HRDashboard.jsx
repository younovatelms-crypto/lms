import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HRDashboard.css';

const PIPELINE_STAGES = [
  { key: 'enrolled', label: 'Pipeline Eligible', tone: 'blue' },
  { key: 'training', label: 'Profile Review', tone: 'violet' },
  { key: 'ready', label: 'Employer Matched', tone: 'green' },
  { key: 'interview_scheduled', label: 'Interview Scheduled', tone: 'amber' },
  { key: 'interview_done', label: 'Interview Done', tone: 'pink' },
  { key: 'offer_extended', label: 'Offer Extended', tone: 'cyan' },
  { key: 'placed', label: 'Placed', tone: 'emerald' },
];

const statusLabels = PIPELINE_STAGES.reduce((acc, stage) => {
  acc[stage.key] = stage.label;
  return acc;
}, {});

const Icon = ({ name }) => <i className={`ti ti-${name}`} aria-hidden="true" />;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchJson = async (url) => {
  const response = await fetch(url, { headers: getAuthHeaders() });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed for ${url}`);
  }

  return data;
};

const asDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const hasEvaluationScore = (candidate) => {
  const score = Number(candidate?.hrEvaluation?.overallScore);
  return Number.isFinite(score);
};

const humanize = (value) => {
  if (!value) return 'Not updated';
  return statusLabels[value] || String(value).replace(/_/g, ' ');
};

const formatDateTime = (value) => {
  const date = asDate(value);
  if (!date) return 'Not scheduled';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatRelativeTime = (value) => {
  const date = asDate(value);
  if (!date) return 'Recently';

  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const getWeekBounds = () => {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysFromMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
};

const percentage = (value, total) => {
  if (!total || total <= 0) return 0;
  return Math.round((value / total) * 100);
};

const buildPipelineCounts = (dashboard, trainees) => {
  const counts = {};

  if (Array.isArray(dashboard?.pipeline)) {
    dashboard.pipeline.forEach((item) => {
      if (item?._id) counts[item._id] = Number(item.count) || 0;
    });
  }

  if (!Object.keys(counts).length) {
    trainees.forEach((candidate) => {
      const status = candidate.placementStatus || 'enrolled';
      counts[status] = (counts[status] || 0) + 1;
    });
  }

  return counts;
};

const HRDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [trainees, setTrainees] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const [dashboardData, traineesData, interviewsData] = await Promise.all([
          fetchJson('/api/hr/dashboard'),
          fetchJson('/api/hr/trainees'),
          fetchJson('/api/hr/interviews'),
        ]);

        if (cancelled) return;

        setDashboard(dashboardData);
        setTrainees(traineesData.trainees || []);
        setInterviews(interviewsData.interviews || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load HR dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const overview = useMemo(() => {
    const totalCandidates = dashboard?.totalTrainees ?? trainees.length;
    const readyCandidates =
      dashboard?.readyTrainees ??
      trainees.filter((candidate) => candidate.placementStatus === 'ready').length;
    const placedCandidates =
      dashboard?.placedTrainees ??
      trainees.filter((candidate) => candidate.placementStatus === 'placed').length;
    const scheduledInterviews =
      dashboard?.scheduledInterviews ??
      interviews.filter((interview) => interview.status === 'scheduled').length;

    const evaluatedCandidates = trainees.filter(hasEvaluationScore);
    const pendingEvaluations = Math.max(totalCandidates - evaluatedCandidates.length, 0);
    const averageScore =
      evaluatedCandidates.length > 0
        ? Math.round(
            evaluatedCandidates.reduce(
              (sum, candidate) => sum + Number(candidate.hrEvaluation.overallScore),
              0
            ) / evaluatedCandidates.length
          )
        : 0;

    const { start, end } = getWeekBounds();
    const interviewsThisWeek = interviews.filter((interview) => {
      const scheduledAt = asDate(interview.scheduledAt);
      return scheduledAt && scheduledAt >= start && scheduledAt < end;
    }).length;

    return {
      totalCandidates,
      readyCandidates,
      placedCandidates,
      activePipeline: Math.max(totalCandidates - placedCandidates, 0),
      scheduledInterviews,
      evaluatedCandidates: evaluatedCandidates.length,
      pendingEvaluations,
      averageScore,
      interviewsThisWeek,
      placementRate: percentage(placedCandidates, totalCandidates),
      evaluationRate: percentage(evaluatedCandidates.length, totalCandidates),
    };
  }, [dashboard, trainees, interviews]);

  const pipelineItems = useMemo(() => {
    const counts = buildPipelineCounts(dashboard, trainees);

    return PIPELINE_STAGES.map((stage) => ({
      ...stage,
      count: counts[stage.key] || 0,
      percentage: percentage(counts[stage.key] || 0, overview.totalCandidates),
    }));
  }, [dashboard, trainees, overview.totalCandidates]);

  const upcomingInterviews = useMemo(() => {
    const now = new Date();
    const scheduled = interviews
      .filter((interview) => interview.status === 'scheduled')
      .sort((a, b) => (asDate(a.scheduledAt)?.getTime() || 0) - (asDate(b.scheduledAt)?.getTime() || 0));

    const upcoming = scheduled.filter((interview) => {
      const scheduledAt = asDate(interview.scheduledAt);
      return scheduledAt && scheduledAt >= now;
    });

    return (upcoming.length ? upcoming : scheduled).slice(0, 5);
  }, [interviews]);

  const pendingCandidates = useMemo(() => {
    return trainees
      .filter((candidate) => !hasEvaluationScore(candidate))
      .sort((a, b) => (asDate(b.createdAt)?.getTime() || 0) - (asDate(a.createdAt)?.getTime() || 0))
      .slice(0, 5);
  }, [trainees]);

  const topPerformers = useMemo(() => {
    return trainees
      .filter(hasEvaluationScore)
      .sort((a, b) => Number(b.hrEvaluation.overallScore) - Number(a.hrEvaluation.overallScore))
      .slice(0, 5);
  }, [trainees]);

  const recentActivity = useMemo(() => {
    const activities = [];

    interviews.forEach((interview) => {
      const candidateName = interview.trainee?.name || 'Candidate';

      if (interview.status === 'completed') {
        activities.push({
          key: `interview-completed-${interview._id}`,
          icon: 'circle-check',
          tone: 'green',
          title: 'Interview completed',
          description: `${candidateName} - ${interview.interviewerName || 'Interview panel'}`,
          date: interview.completedAt || interview.updatedAt || interview.scheduledAt,
        });
      }

      if (interview.status === 'scheduled') {
        activities.push({
          key: `interview-scheduled-${interview._id}`,
          icon: 'calendar-event',
          tone: 'blue',
          title: 'Interview scheduled',
          description: `${candidateName} - ${formatDateTime(interview.scheduledAt)}`,
          date: interview.createdAt || interview.scheduledAt,
        });
      }
    });

    trainees.forEach((candidate) => {
      if (candidate.hrEvaluation?.evaluatedAt) {
        activities.push({
          key: `evaluation-${candidate._id}`,
          icon: 'clipboard-check',
          tone: 'violet',
          title: 'Evaluation submitted',
          description: `${candidate.name} - Score ${candidate.hrEvaluation.overallScore || 0}%`,
          date: candidate.hrEvaluation.evaluatedAt,
        });
      }

      if (candidate.placementStatus === 'placed') {
        activities.push({
          key: `placed-${candidate._id}`,
          icon: 'briefcase',
          tone: 'emerald',
          title: 'Candidate placed',
          description: `${candidate.name}${candidate.companyName ? ` - ${candidate.companyName}` : ''}`,
          date: candidate.placementUpdatedAt || candidate.updatedAt,
        });
      }
    });

    return activities
      .sort((a, b) => (asDate(b.date)?.getTime() || 0) - (asDate(a.date)?.getTime() || 0))
      .slice(0, 6);
  }, [interviews, trainees]);

  if (loading) {
    return (
      <div className="hr-dashboard">
        <div className="hr-dashboard__state">Loading HR dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hr-dashboard">
        <div className="hr-dashboard__state hr-dashboard__state--error">
          <Icon name="alert-circle" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-dashboard">
      <section className="hr-dashboard__header">
        <div>
          <p className="hr-dashboard__eyebrow">Placement operations</p>
          <h2>HR Dashboard</h2>
          <p className="hr-dashboard__subtitle">
            Pipeline health, evaluations, and interview activity in one view.
          </p>
        </div>

        <div className="hr-dashboard__actions" aria-label="HR dashboard actions">
          <button
            type="button"
            className="hr-dashboard__action hr-dashboard__action--primary"
            onClick={() => navigate('/hr/interviews')}
          >
            <Icon name="calendar-plus" />
            <span>Schedule Interview</span>
          </button>
          <button
            type="button"
            className="hr-dashboard__action"
            onClick={() => navigate('/hr/evaluations')}
          >
            <Icon name="clipboard-check" />
            <span>Evaluate Candidate</span>
          </button>
        </div>
      </section>

      <section className="hr-dashboard__metrics" aria-label="HR performance metrics">
        <MetricCard
          tone="blue"
          icon="users"
          label="Total Candidates"
          value={overview.totalCandidates}
          detail={`${overview.activePipeline} active in placement pipeline`}
        />
        <MetricCard
          tone="green"
          icon="user-check"
          label="Placement Ready"
          value={overview.readyCandidates}
          detail={`${overview.evaluationRate}% evaluation coverage`}
        />
        <MetricCard
          tone="amber"
          icon="calendar-event"
          label="Scheduled Interviews"
          value={overview.scheduledInterviews}
          detail={`${overview.interviewsThisWeek} interviews this week`}
        />
        <MetricCard
          tone="emerald"
          icon="briefcase"
          label="Placed"
          value={overview.placedCandidates}
          detail={`${overview.placementRate}% placement rate`}
        />
      </section>

      <section className="hr-dashboard__grid">
        <div className="hr-dashboard__card hr-dashboard__card--wide">
          <CardHeader
            title="Placement Pipeline"
            actionLabel="View Pipeline"
            actionIcon="arrows-right"
            onAction={() => navigate('/hr/pipeline')}
          />

          <div className="hr-dashboard__pipeline">
            {pipelineItems.map((stage) => (
              <div key={stage.key} className="hr-dashboard__pipeline-row">
                <div className="hr-dashboard__pipeline-label">
                  <span className="hr-dashboard__dot" data-tone={stage.tone} />
                  <span>{stage.label}</span>
                </div>
                <div className="hr-dashboard__pipeline-bar" aria-hidden="true">
                  <span style={{ width: `${stage.percentage}%` }} data-tone={stage.tone} />
                </div>
                <strong>{stage.count}</strong>
              </div>
            ))}
          </div>

          <div className="hr-dashboard__summary-strip">
            <SummaryItem label="Conversion" value={`${overview.placementRate}%`} />
            <SummaryItem label="Avg. Score" value={overview.averageScore ? `${overview.averageScore}%` : 'N/A'} />
            <SummaryItem label="Pending Eval." value={overview.pendingEvaluations} />
          </div>
        </div>

        <div className="hr-dashboard__card">
          <CardHeader
            title="Evaluation Queue"
            actionLabel="Open"
            actionIcon="external-link"
            onAction={() => navigate('/hr/evaluations')}
          />

          <div className="hr-dashboard__score-block">
            <span>{overview.evaluatedCandidates}</span>
            <p>candidates evaluated</p>
          </div>

          <div className="hr-dashboard__queue">
            {pendingCandidates.length ? (
              pendingCandidates.map((candidate) => (
                <button
                  type="button"
                  key={candidate._id}
                  className="hr-dashboard__candidate-row"
                  onClick={() => navigate(`/hr/evaluation/${candidate._id}`)}
                >
                  <span className="hr-dashboard__avatar">{candidate.name?.charAt(0)?.toUpperCase() || 'C'}</span>
                  <span>
                    <strong>{candidate.name}</strong>
                    <small>{candidate.batchId?.name || humanize(candidate.placementStatus)}</small>
                  </span>
                  <Icon name="chevron-right" />
                </button>
              ))
            ) : (
              <EmptyState icon="clipboard-check" text="No pending evaluations" />
            )}
          </div>
        </div>
      </section>

      <section className="hr-dashboard__grid hr-dashboard__grid--three">
        <div className="hr-dashboard__card">
          <CardHeader
            title="Upcoming Interviews"
            actionLabel="Manage"
            actionIcon="calendar"
            onAction={() => navigate('/hr/interviews')}
          />

          <div className="hr-dashboard__list">
            {upcomingInterviews.length ? (
              upcomingInterviews.map((interview) => (
                <div key={interview._id} className="hr-dashboard__list-row">
                  <span className="hr-dashboard__list-icon" data-tone="amber">
                    <Icon name="calendar-time" />
                  </span>
                  <span>
                    <strong>{interview.trainee?.name || 'Candidate'}</strong>
                    <small>{interview.interviewerName || 'Interview panel'}</small>
                  </span>
                  <time>{formatDateTime(interview.scheduledAt)}</time>
                </div>
              ))
            ) : (
              <EmptyState icon="calendar-off" text="No scheduled interviews" />
            )}
          </div>
        </div>

        <div className="hr-dashboard__card">
          <CardHeader
            title="Top Performers"
            actionLabel="Review"
            actionIcon="chart-bar"
            onAction={() => navigate('/hr/evaluations')}
          />

          <div className="hr-dashboard__list">
            {topPerformers.length ? (
              topPerformers.map((candidate, index) => (
                <button
                  type="button"
                  key={candidate._id}
                  className="hr-dashboard__rank-row"
                  onClick={() => navigate(`/hr/evaluation/${candidate._id}`)}
                >
                  <span className="hr-dashboard__rank">{index + 1}</span>
                  <span>
                    <strong>{candidate.name}</strong>
                    <small>{humanize(candidate.placementStatus)}</small>
                  </span>
                  <b>{candidate.hrEvaluation.overallScore}%</b>
                </button>
              ))
            ) : (
              <EmptyState icon="chart-dots" text="No evaluated candidates yet" />
            )}
          </div>
        </div>

        <div className="hr-dashboard__card">
          <CardHeader title="Recent Activity" />

          <div className="hr-dashboard__activity">
            {recentActivity.length ? (
              recentActivity.map((activity) => (
                <div key={activity.key} className="hr-dashboard__activity-row">
                  <span className="hr-dashboard__list-icon" data-tone={activity.tone}>
                    <Icon name={activity.icon} />
                  </span>
                  <span>
                    <strong>{activity.title}</strong>
                    <small>{activity.description}</small>
                  </span>
                  <time>{formatRelativeTime(activity.date)}</time>
                </div>
              ))
            ) : (
              <EmptyState icon="activity" text="No recent HR activity" />
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const MetricCard = ({ tone, icon, label, value, detail }) => (
  <article className="hr-dashboard__metric" data-tone={tone}>
    <span className="hr-dashboard__metric-icon">
      <Icon name={icon} />
    </span>
    <span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </span>
  </article>
);

const CardHeader = ({ title, actionLabel, actionIcon, onAction }) => (
  <div className="hr-dashboard__card-header">
    <h3>{title}</h3>
    {actionLabel && (
      <button type="button" onClick={onAction}>
        {actionIcon && <Icon name={actionIcon} />}
        <span>{actionLabel}</span>
      </button>
    )}
  </div>
);

const SummaryItem = ({ label, value }) => (
  <div className="hr-dashboard__summary-item">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const EmptyState = ({ icon, text }) => (
  <div className="hr-dashboard__empty">
    <Icon name={icon} />
    <span>{text}</span>
  </div>
);

export default HRDashboard;
