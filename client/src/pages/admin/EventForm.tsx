import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';

interface ProjectInput {
  name: string;
  distance: number;
  max_participants: number;
}

export default function EventForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [cutoffTime, setCutoffTime] = useState('');
  const [fee, setFee] = useState('');
  const [supplies, setSupplies] = useState('');
  const [status, setStatus] = useState('upcoming');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [projects, setProjects] = useState<ProjectInput[]>([
    { name: 'full', distance: 42.195, max_participants: 10000 },
    { name: 'half', distance: 21.0975, max_participants: 8000 },
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const fetchEvent = async () => {
        try {
          const res = await api.get<{ data: Record<string, unknown> & { projects: Array<{ name: string; distance: number; max_participants: number }> } }>(`/events/${id}`);
          const e = res.data;
          setName(e.name as string);
          setCity(e.city as string);
          setDate(e.date as string);
          setRouteDescription(e.route_description as string);
          setStartPoint(e.start_point as string);
          setEndPoint(e.end_point as string);
          setCutoffTime(e.cutoff_time as string);
          setFee(String(e.fee));
          setSupplies(e.supplies as string);
          setStatus(e.status as string);
          setRegistrationDeadline(e.registration_deadline as string);
          if (e.projects && e.projects.length > 0) {
            setProjects(e.projects.map(p => ({
              name: p.name,
              distance: p.distance,
              max_participants: p.max_participants,
            })));
          }
        } catch {
          navigate('/admin');
        }
      };
      fetchEvent();
    }
  }, [id, isEdit, navigate]);

  const addProject = () => {
    setProjects([...projects, { name: 'family', distance: 5, max_participants: 2000 }]);
  };

  const removeProject = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  const updateProject = (index: number, field: keyof ProjectInput, value: string | number) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], [field]: value };
    setProjects(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !city || !date || !registrationDeadline) {
      setError('请填写必填信息');
      return;
    }

    setLoading(true);
    setError('');

    const body = {
      name, city, date,
      route_description: routeDescription,
      start_point: startPoint,
      end_point: endPoint,
      cutoff_time: cutoffTime,
      fee: Number(fee) || 0,
      supplies, status, registration_deadline: registrationDeadline,
      projects: isEdit ? undefined : projects,
    };

    try {
      if (isEdit) {
        await api.put(`/admin/events/${id}`, body);
      } else {
        await api.post('/admin/events', body);
      }
      navigate('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 className="page-title">{isEdit ? '编辑赛事' : '创建赛事'}</h1>

      <form onSubmit={handleSubmit} style={{
        background: 'white',
        borderRadius: 12,
        padding: 32,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">赛事名称 *</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="赛事名称" />
          </div>
          <div className="form-group">
            <label className="form-label">城市 *</label>
            <input className="form-input" value={city} onChange={e => setCity(e.target.value)} placeholder="城市" />
          </div>
          <div className="form-group">
            <label className="form-label">比赛日期 *</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">报名截止日期 *</label>
            <input className="form-input" type="date" value={registrationDeadline} onChange={e => setRegistrationDeadline(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">报名费（元）</label>
            <input className="form-input" type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">状态</label>
            <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="upcoming">即将开赛</option>
              <option value="ongoing">进行中</option>
              <option value="finished">已结束</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">路线描述</label>
          <textarea
            className="form-input"
            value={routeDescription}
            onChange={e => setRouteDescription(e.target.value)}
            placeholder="描述赛事路线"
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">起点</label>
            <input className="form-input" value={startPoint} onChange={e => setStartPoint(e.target.value)} placeholder="起点" />
          </div>
          <div className="form-group">
            <label className="form-label">终点</label>
            <input className="form-input" value={endPoint} onChange={e => setEndPoint(e.target.value)} placeholder="终点" />
          </div>
          <div className="form-group">
            <label className="form-label">关门时间</label>
            <input className="form-input" value={cutoffTime} onChange={e => setCutoffTime(e.target.value)} placeholder="如 6小时" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">参赛物资说明</label>
          <textarea
            className="form-input"
            value={supplies}
            onChange={e => setSupplies(e.target.value)}
            placeholder="参赛物资说明"
            rows={2}
            style={{ resize: 'vertical' }}
          />
        </div>

        {!isEdit && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>比赛项目</label>
              <button type="button" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 13 }} onClick={addProject}>
                添加项目
              </button>
            </div>
            {projects.map((p, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                marginBottom: 12,
                padding: 12,
                background: '#f8f9fa',
                borderRadius: 8,
              }}>
                <select
                  className="form-input"
                  style={{ flex: 1 }}
                  value={p.name}
                  onChange={e => updateProject(i, 'name', e.target.value)}
                >
                  <option value="full">全程马拉松</option>
                  <option value="half">半程马拉松</option>
                  <option value="family">亲子跑</option>
                </select>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  type="number"
                  step="0.001"
                  value={p.distance}
                  onChange={e => updateProject(i, 'distance', Number(e.target.value))}
                  placeholder="距离(km)"
                />
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  type="number"
                  value={p.max_participants}
                  onChange={e => updateProject(i, 'max_participants', Number(e.target.value))}
                  placeholder="最大人数"
                />
                {projects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProject(i)}
                    style={{ color: '#e63946', background: 'none', fontSize: 20, padding: '0 8px' }}
                  >
                    x
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/admin')}>
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
