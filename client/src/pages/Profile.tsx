import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface RegistrationRecord {
  id: number;
  event_id: number;
  project_id: number;
  event_name: string;
  city: string;
  event_date: string;
  event_status: string;
  project_name: string;
  distance: number;
  bib_number: string;
  payment_status: string;
  certificate_url: string;
  finish_time: string;
  created_at: string;
}

const projectLabels: Record<string, string> = {
  full: '全程马拉松',
  half: '半程马拉松',
  family: '亲子跑',
};

export default function Profile() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [finishTime, setFinishTime] = useState('');
  const [certUrl, setCertUrl] = useState('');

  const fetchRegistrations = async () => {
    try {
      const res = await api.get<{ data: RegistrationRecord[] }>('/registrations/my');
      setRegistrations(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handlePay = async (regId: number) => {
    setPayingId(regId);
    try {
      await api.post(`/registrations/${regId}/pay`, {});
      fetchRegistrations();
    } catch {
      alert('支付失败');
    } finally {
      setPayingId(null);
    }
  };

  const handleUploadCert = async (regId: number) => {
    setUploadingId(regId);
    try {
      await api.post(`/registrations/${regId}/certificate`, {
        certificate_url: certUrl,
        finish_time: finishTime,
      });
      fetchRegistrations();
      setFinishTime('');
      setCertUrl('');
    } catch {
      alert('上传失败');
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) return <div className="loading">加载中...</div>;

  const upcomingEvents = registrations.filter(r => r.event_status === 'upcoming');
  const finishedEvents = registrations.filter(r => r.event_status === 'finished');

  return (
    <div className="main-content">
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: 16,
        padding: '32px',
        color: 'white',
        marginBottom: 32,
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>个人中心</h1>
        <div style={{ opacity: 0.8, fontSize: 15 }}>
          {user?.username} | {user?.email}
        </div>
      </div>

      {/* Upcoming reminders */}
      {upcomingEvents.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }}>
            即将参赛
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {upcomingEvents.map(reg => (
              <div key={reg.id} style={{
                background: '#fff8e1',
                border: '1px solid #ffe082',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{reg.event_name}</div>
                  <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                    {reg.city} | {reg.event_date} | {projectLabels[reg.project_name] || reg.project_name}
                  </div>
                  <div style={{ fontSize: 14, color: '#e65100', marginTop: 4 }}>
                    参赛号码: {reg.bib_number}
                  </div>
                </div>
                <div>
                  {reg.payment_status === 'pending' ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => handlePay(reg.id)}
                      disabled={payingId === reg.id}
                    >
                      {payingId === reg.id ? '支付中...' : '立即支付'}
                    </button>
                  ) : (
                    <span style={{ color: '#2e7d32', fontWeight: 600 }}>已支付</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All registrations */}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }}>
        我的报名记录
      </h2>

      {registrations.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 40,
          textAlign: 'center',
          color: '#888',
        }}>
          暂无报名记录
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {registrations.map(reg => (
            <div key={reg.id} style={{
              background: 'white',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{reg.event_name}</h3>
                  <div style={{ fontSize: 14, color: '#666', lineHeight: 2 }}>
                    <div>{reg.city} | {reg.event_date}</div>
                    <div>项目: {projectLabels[reg.project_name] || reg.project_name} ({reg.distance}公里)</div>
                    <div>参赛号码: <strong>{reg.bib_number}</strong></div>
                    <div>
                      支付状态:
                      <span style={{
                        color: reg.payment_status === 'paid' ? '#2e7d32' : '#e65100',
                        fontWeight: 600,
                        marginLeft: 4,
                      }}>
                        {reg.payment_status === 'paid' ? '已支付' : reg.payment_status === 'pending' ? '待支付' : '已退款'}
                      </span>
                    </div>
                    {reg.finish_time && <div>完赛成绩: {reg.finish_time}</div>}
                  </div>
                </div>
                <span className={`badge badge-${reg.event_status}`}>
                  {reg.event_status === 'upcoming' ? '即将开赛' : reg.event_status === 'finished' ? '已结束' : '进行中'}
                </span>
              </div>

              {/* Upload certificate for finished events */}
              {reg.event_status === 'finished' && !reg.certificate_url && (
                <div style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid #eee',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-end',
                }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">完赛成绩</label>
                    <input
                      className="form-input"
                      placeholder="如 3:45:30"
                      value={uploadingId === reg.id ? finishTime : ''}
                      onChange={e => {
                        setFinishTime(e.target.value);
                        setUploadingId(reg.id);
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">证书链接</label>
                    <input
                      className="form-input"
                      placeholder="证书URL"
                      value={uploadingId === reg.id ? certUrl : ''}
                      onChange={e => {
                        setCertUrl(e.target.value);
                        setUploadingId(reg.id);
                      }}
                    />
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleUploadCert(reg.id)}
                    disabled={uploadingId === reg.id && (!finishTime || !certUrl)}
                  >
                    上传
                  </button>
                </div>
              )}

              {reg.certificate_url && (
                <div style={{ marginTop: 12, color: '#2a9d8f', fontSize: 14 }}>
                  已上传完赛证书
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
