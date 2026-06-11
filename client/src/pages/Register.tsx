import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Project {
  id: number;
  name: string;
  distance: number;
  max_participants: number;
  current_count: number;
}

interface EventData {
  id: number;
  name: string;
  city: string;
  date: string;
  fee: number;
  projects: Project[];
}

const projectLabels: Record<string, string> = {
  full: '全程马拉松',
  half: '半程马拉松',
  family: '亲子跑',
};

export default function Register() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [projectId, setProjectId] = useState(searchParams.get('project') || '');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const fetchEvent = async () => {
      try {
        const res = await api.get<{ data: EventData }>(`/events/${id}`);
        setEvent(res.data);
      } catch {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !emergencyContact || !emergencyPhone) {
      setError('请填写完整信息');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/registrations', {
        event_id: Number(id),
        project_id: Number(projectId),
        emergency_contact: emergencyContact,
        emergency_phone: emergencyPhone,
      });
      navigate('/profile');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '报名失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (!event) return <div className="loading">赛事不存在</div>;

  const selectedProject = event.projects.find(p => String(p.id) === String(projectId));

  return (
    <div className="main-content" style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 className="page-title">赛事报名</h1>

      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{event.name}</h2>
        <div style={{ color: '#666', fontSize: 14 }}>
          {event.city} | {event.date} | ¥{event.fee}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{
        background: 'white',
        borderRadius: 12,
        padding: 32,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div className="form-group">
          <label className="form-label">参赛项目 *</label>
          <select
            className="form-input"
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
          >
            <option value="">请选择项目</option>
            {event.projects.map(p => (
              <option key={p.id} value={p.id} disabled={p.current_count >= p.max_participants}>
                {projectLabels[p.name] || p.name} - {p.distance}公里
                {p.current_count >= p.max_participants ? ' (已满)' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedProject && (
          <div style={{
            background: '#f8f9fa',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            fontSize: 14,
            color: '#555',
          }}>
            已选: {projectLabels[selectedProject.name]} | {selectedProject.distance}公里 |
            剩余名额: {selectedProject.max_participants - selectedProject.current_count}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">紧急联系人 *</label>
          <input
            className="form-input"
            type="text"
            value={emergencyContact}
            onChange={e => setEmergencyContact(e.target.value)}
            placeholder="请输入紧急联系人姓名"
          />
        </div>

        <div className="form-group">
          <label className="form-label">紧急联系人电话 *</label>
          <input
            className="form-input"
            type="tel"
            value={emergencyPhone}
            onChange={e => setEmergencyPhone(e.target.value)}
            placeholder="请输入紧急联系人电话"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={submitting}
          >
            {submitting ? '提交中...' : '确认报名'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate(-1)}
          >
            返回
          </button>
        </div>
      </form>
    </div>
  );
}
