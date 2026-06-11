import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

interface EventStat {
  id: number;
  name: string;
  city: string;
  date: string;
  status: string;
  registration_count: number;
  paid_count: number;
}

interface Stats {
  totalEvents: number;
  totalUsers: number;
  totalRegistrations: number;
  paidRegistrations: number;
  events: EventStat[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get<{ data: Stats }>('/admin/stats');
        setStats(res.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="loading">加载中...</div>;
  if (!stats) return <div className="loading">加载失败</div>;

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>管理后台</h1>
        <Link to="/admin/events/new" className="btn btn-primary">创建赛事</Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 32,
      }}>
        <StatCard label="赛事总数" value={stats.totalEvents} color="#e63946" />
        <StatCard label="注册用户" value={stats.totalUsers} color="#457b9d" />
        <StatCard label="报名总数" value={stats.totalRegistrations} color="#2a9d8f" />
        <StatCard label="已支付" value={stats.paidRegistrations} color="#f4a261" />
      </div>

      <div style={{
        background: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #eee', fontWeight: 600, fontSize: 16 }}>
          赛事列表
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={thStyle}>赛事名称</th>
              <th style={thStyle}>城市</th>
              <th style={thStyle}>日期</th>
              <th style={thStyle}>报名人数</th>
              <th style={thStyle}>已支付</th>
              <th style={thStyle}>状态</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {stats.events.map(event => (
              <tr key={event.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={tdStyle}>{event.name}</td>
                <td style={tdStyle}>{event.city}</td>
                <td style={tdStyle}>{event.date}</td>
                <td style={tdStyle}>{event.registration_count}</td>
                <td style={tdStyle}>{event.paid_count}</td>
                <td style={tdStyle}>
                  <span className={`badge badge-${event.status}`}>
                    {event.status === 'upcoming' ? '即将开赛' : event.status === 'finished' ? '已结束' : '进行中'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <Link
                    to={`/admin/events/${event.id}/registrations`}
                    style={{ color: '#457b9d', fontSize: 14 }}
                  >
                    查看报名
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 14,
  fontWeight: 600,
  color: '#555',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 14,
  color: '#333',
};
