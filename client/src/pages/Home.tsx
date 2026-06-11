import { useState, useEffect } from 'react';
import { api } from '../api/client';
import EventCard from '../components/EventCard';

interface EventData {
  id: number;
  name: string;
  city: string;
  date: string;
  status: string;
  fee: number;
  registration_deadline: string;
}

export default function Home() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get<{ data: EventData[] }>('/events');
        setEvents(res.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) return <div className="loading">加载赛事列表...</div>;

  return (
    <div className="main-content">
      <div style={{
        textAlign: 'center',
        marginBottom: 40,
        padding: '40px 0',
      }}>
        <h1 style={{
          fontSize: 42,
          fontWeight: 800,
          color: '#1a1a2e',
          marginBottom: 12,
        }}>
          发现你的下一场马拉松
        </h1>
        <p style={{ fontSize: 18, color: '#666' }}>
          挑战自我，超越极限，每一步都是新的开始
        </p>
      </div>

      {error && <div className="error-message" style={{ textAlign: 'center' }}>{error}</div>}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: 24,
      }}>
        {events.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {events.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
          暂无赛事，敬请期待
        </div>
      )}
    </div>
  );
}
