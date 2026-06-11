import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import Countdown from '../components/Countdown';

interface Project {
  id: number;
  event_id: number;
  name: string;
  distance: number;
  max_participants: number;
  current_count: number;
}

interface EventDetail {
  id: number;
  name: string;
  city: string;
  date: string;
  route_description: string;
  start_point: string;
  end_point: string;
  cutoff_time: string;
  fee: number;
  supplies: string;
  status: string;
  image_url: string;
  registration_deadline: string;
  projects: Project[];
}

const projectLabels: Record<string, string> = {
  full: '全程马拉松',
  half: '半程马拉松',
  family: '亲子跑',
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get<{ data: EventDetail }>(`/events/${id}`);
        setEvent(res.data);
      } catch {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, navigate]);

  if (loading) return <div className="loading">加载中...</div>;
  if (!event) return <div className="loading">赛事不存在</div>;

  const isRegisterable = event.status === 'upcoming' && new Date(event.registration_deadline) > new Date();

  return (
    <div className="main-content">
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: 16,
        padding: '40px 32px',
        color: 'white',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(230,57,70,0.15)',
        }} />
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, position: 'relative' }}>
          {event.name}
        </h1>
        <div style={{ display: 'flex', gap: 24, fontSize: 16, opacity: 0.9, position: 'relative' }}>
          <span>{event.city}</span>
          <span>{event.date}</span>
          <span>¥{event.fee}</span>
        </div>
        {isRegisterable && (
          <div style={{ marginTop: 16, position: 'relative' }}>
            <Countdown deadline={event.registration_deadline} />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <InfoCard title="路线描述" content={event.route_description || '暂无'} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <SmallInfoCard label="起点" value={event.start_point || '待定'} />
          <SmallInfoCard label="终点" value={event.end_point || '待定'} />
          <SmallInfoCard label="关门时间" value={event.cutoff_time || '待定'} />
          <SmallInfoCard label="报名费" value={`¥${event.fee}`} />
        </div>
      </div>

      {event.supplies && (
        <InfoCard title="参赛物资" content={event.supplies} />
      )}

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }}>
          选择参赛项目
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {event.projects.map(project => {
            const remaining = project.max_participants - project.current_count;
            const isFull = remaining <= 0;
            const isSelected = selectedProject === project.id;
            return (
              <div
                key={project.id}
                onClick={() => !isFull && setSelectedProject(project.id)}
                style={{
                  background: isSelected ? '#fff5f5' : 'white',
                  border: `2px solid ${isSelected ? '#e63946' : '#eee'}`,
                  borderRadius: 12,
                  padding: 20,
                  cursor: isFull ? 'not-allowed' : 'pointer',
                  opacity: isFull ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  {projectLabels[project.name] || project.name}
                </div>
                <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>
                  {project.distance} 公里
                </div>
                <div style={{ fontSize: 14 }}>
                  <span style={{ color: isFull ? '#e63946' : '#2a9d8f' }}>
                    {isFull ? '已满' : `剩余 ${remaining} 个名额`}
                  </span>
                </div>
                <div style={{
                  marginTop: 8,
                  background: '#f0f0f0',
                  borderRadius: 4,
                  height: 6,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(project.current_count / project.max_participants) * 100}%`,
                    height: '100%',
                    background: isFull ? '#e63946' : '#2a9d8f',
                    borderRadius: 4,
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 32, textAlign: 'center' }}>
        {isRegisterable ? (
          <button
            className="btn btn-primary"
            style={{ padding: '14px 48px', fontSize: 18 }}
            disabled={!selectedProject}
            onClick={() => {
              if (!user) {
                navigate('/login');
                return;
              }
              navigate(`/events/${event.id}/register?project=${selectedProject}`);
            }}
          >
            {user ? '立即报名' : '登录后报名'}
          </button>
        ) : (
          <div style={{ color: '#888', fontSize: 16 }}>
            {event.status === 'finished' ? '赛事已结束' : '报名已截止'}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ title, content }: { title: string; content: string }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e', marginBottom: 12 }}>
        {title}
      </h3>
      <p style={{ color: '#555', fontSize: 15, lineHeight: 1.8 }}>
        {content}
      </p>
    </div>
  );
}

function SmallInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>{value}</div>
    </div>
  );
}
