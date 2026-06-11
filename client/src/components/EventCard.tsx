import { Link } from 'react-router-dom';
import Countdown from './Countdown';

interface EventData {
  id: number;
  name: string;
  city: string;
  date: string;
  status: string;
  fee: number;
  registration_deadline: string;
}

interface EventCardProps {
  event: EventData;
}

export default function EventCard({ event }: EventCardProps) {
  const statusLabel: Record<string, string> = {
    upcoming: '即将开赛',
    ongoing: '进行中',
    finished: '已结束',
  };

  return (
    <Link to={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
        }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #e63946 0%, #f4845f 100%)',
          padding: '24px 20px',
          color: 'white',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: 12,
            right: 12,
          }}>
            <span className={`badge badge-${event.status}`}>
              {statusLabel[event.status] || event.status}
            </span>
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            {event.name}
          </h3>
          <div style={{ display: 'flex', gap: 16, fontSize: 14, opacity: 0.9 }}>
            <span>{event.city}</span>
            <span>{event.date}</span>
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#e63946' }}>
                ¥{event.fee}
              </span>
              <span style={{ fontSize: 13, color: '#888', marginLeft: 4 }}>起</span>
            </div>
            {event.status === 'upcoming' && (
              <Countdown deadline={event.registration_deadline} />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
