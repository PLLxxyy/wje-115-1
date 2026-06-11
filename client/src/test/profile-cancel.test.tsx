import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Profile from '../pages/Profile';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  phone: '13900000000',
};

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

const baseReg = (overrides: Partial<RegistrationRecord> = {}): RegistrationRecord => ({
  id: 1,
  event_id: 1,
  project_id: 1,
  event_name: '2026北京国际马拉松',
  city: '北京',
  event_date: '2026-09-15',
  event_status: 'upcoming',
  project_name: 'full',
  distance: 42.195,
  bib_number: 'F0100001',
  payment_status: 'paid',
  certificate_url: '',
  finish_time: '',
  created_at: '2026-06-01 10:00:00',
  ...overrides,
});

const mockApiGet = vi.fn();
const mockApiDelete = vi.fn();

vi.mock('../api/client', () => ({
  api: {
    get: (endpoint: string) => mockApiGet(endpoint),
    post: vi.fn(),
    put: vi.fn(),
    delete: (endpoint: string) => mockApiDelete(endpoint),
  },
}));

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );
}

function mockGetRegistrations(data: RegistrationRecord[]) {
  mockApiGet.mockImplementation((endpoint: string) => {
    if (endpoint === '/registrations/my') return Promise.resolve({ data });
    return Promise.reject(new Error('unexpected endpoint: ' + endpoint));
  });
}

function getUpcomingSection() {
  const headline = screen.getByText('即将参赛');
  return headline.closest('div[style]')!;
}

function getUpcomingScope() {
  return within(getUpcomingSection());
}

function getRecordsSection() {
  const headline = screen.getByText('我的报名记录');
  const grid = headline.nextElementSibling!;
  return grid as HTMLElement;
}

function getRecordsScope() {
  return within(getRecordsSection());
}

describe('个人中心 - 取消报名状态展示', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as vi.Mock).mockReturnValue({ user: mockUser, token: 'fake-token', loading: false });
  });

  describe('场景1: 已取消/退款状态的支付状态显示', () => {
    it('报名记录卡片中支付状态应显示为"已取消/退款"，颜色为灰色', async () => {
      mockGetRegistrations([baseReg({ payment_status: 'refunded' })]);

      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('我的报名记录')).toBeInTheDocument();
      });

      const statusEl = screen.getByText('已取消/退款');
      expect(statusEl).toBeInTheDocument();
      const color = statusEl.style.color;
      expect(color === '#888' || color === 'rgb(136, 136, 136)').toBe(true);
    });
  });

  describe('场景2: 已取消的 upcoming 赛事不出现在"即将参赛"提醒中', () => {
    it('当只有 refunded 状态的 upcoming 报名时，"即将参赛"区块不应出现', async () => {
      mockGetRegistrations([baseReg({ payment_status: 'refunded', event_status: 'upcoming' })]);

      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('我的报名记录')).toBeInTheDocument();
      });

      expect(screen.queryByText('即将参赛')).not.toBeInTheDocument();
    });

    it('同时存在未取消和已取消的 upcoming 报名时，"即将参赛"只显示未取消的那个', async () => {
      const refundedBeijing = baseReg({
        id: 1,
        payment_status: 'refunded',
        event_status: 'upcoming',
        event_name: '2026北京国际马拉松',
      });
      const paidShanghai = baseReg({
        id: 2,
        payment_status: 'paid',
        event_status: 'upcoming',
        event_name: '2026上海半程马拉松',
        bib_number: 'H0200001',
      });

      mockGetRegistrations([refundedBeijing, paidShanghai]);

      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('即将参赛')).toBeInTheDocument();
      });

      const upcomingScope = getUpcomingScope();
      expect(upcomingScope.getByText('2026上海半程马拉松')).toBeInTheDocument();
      expect(upcomingScope.queryByText('2026北京国际马拉松')).not.toBeInTheDocument();

      const recordsScope = getRecordsScope();
      expect(recordsScope.getByText('2026北京国际马拉松')).toBeInTheDocument();
      expect(recordsScope.getByText('2026上海半程马拉松')).toBeInTheDocument();
    });
  });

  describe('场景3: 已取消报名记录不显示"取消报名"按钮', () => {
    it('payment_status 为 refunded 的记录不应出现任何"取消报名"按钮', async () => {
      mockGetRegistrations([baseReg({ payment_status: 'refunded', event_status: 'upcoming' })]);

      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('我的报名记录')).toBeInTheDocument();
      });

      expect(screen.queryByText('取消报名')).not.toBeInTheDocument();
    });

    it('未取消的 upcoming 报名应显示"取消报名"按钮（即将参赛区和记录区各一个）', async () => {
      mockGetRegistrations([baseReg({ payment_status: 'paid', event_status: 'upcoming' })]);

      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('我的报名记录')).toBeInTheDocument();
      });

      expect(screen.getAllByText('取消报名')).toHaveLength(2);
    });
  });

  describe('场景4: 取消报名交互 - 调用 DELETE 接口并刷新状态', () => {
    it('点击取消报名后应调用 DELETE /registrations/:id，前端 API 路径不带 /api 前缀', async () => {
      const regBefore = baseReg({ id: 99, payment_status: 'paid', event_status: 'upcoming' });
      const regAfter = baseReg({ id: 99, payment_status: 'refunded', event_status: 'upcoming' });

      mockApiGet
        .mockImplementationOnce((endpoint: string) => {
          if (endpoint === '/registrations/my') return Promise.resolve({ data: [regBefore] });
          return Promise.reject(new Error('unexpected'));
        })
        .mockImplementationOnce((endpoint: string) => {
          if (endpoint === '/registrations/my') return Promise.resolve({ data: [regAfter] });
          return Promise.reject(new Error('unexpected'));
        });

      mockApiDelete.mockImplementation((endpoint: string) => {
        if (endpoint === '/registrations/99') {
          return Promise.resolve({ data: { message: '取消成功，已申请退款', refunded: true, fee: 200 } });
        }
        return Promise.reject(new Error('unexpected'));
      });

      renderProfile();

      await waitFor(() => {
        expect(screen.getAllByText('取消报名')).toHaveLength(2);
      });

      const cancelBtn = screen.getAllByText('取消报名')[0];
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(mockApiDelete).toHaveBeenCalledTimes(1);
        expect(mockApiDelete).toHaveBeenCalledWith('/registrations/99');
      });

      await waitFor(() => {
        expect(screen.getByText('已取消/退款')).toBeInTheDocument();
      });
      expect(screen.queryByText('取消报名')).not.toBeInTheDocument();
      expect(screen.queryByText('即将参赛')).not.toBeInTheDocument();
    });
  });

  describe('场景5: 已取消但仍为 upcoming 的报名，报名记录页保留记录', () => {
    it('所有已取消报名仍在"我的报名记录"列表中可查看', async () => {
      mockGetRegistrations([
        baseReg({ id: 1, payment_status: 'refunded', event_status: 'upcoming', event_name: '取消赛事A' }),
        baseReg({ id: 2, payment_status: 'paid', event_status: 'finished', event_name: '已完赛B' }),
      ]);

      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('我的报名记录')).toBeInTheDocument();
      });

      expect(screen.getByText('取消赛事A')).toBeInTheDocument();
      expect(screen.getByText('已完赛B')).toBeInTheDocument();
      expect(screen.queryByText('即将参赛')).not.toBeInTheDocument();
    });
  });

  describe('场景6: 即将参赛卡片的支付状态展示', () => {
    it('待支付 upcoming 显示"立即支付"按钮，不显示"已取消"', async () => {
      mockGetRegistrations([baseReg({ payment_status: 'pending', event_status: 'upcoming' })]);

      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('即将参赛')).toBeInTheDocument();
      });

      const upcomingScope = getUpcomingScope();
      expect(upcomingScope.getByText('立即支付')).toBeInTheDocument();
      expect(upcomingScope.queryByText('已取消')).not.toBeInTheDocument();
    });

    it('已支付 upcoming 显示"已支付"文案和"取消报名"按钮', async () => {
      mockGetRegistrations([baseReg({ payment_status: 'paid', event_status: 'upcoming' })]);

      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('即将参赛')).toBeInTheDocument();
      });

      const upcomingScope = getUpcomingScope();
      expect(upcomingScope.getByText('已支付')).toBeInTheDocument();
      expect(upcomingScope.getByText('取消报名')).toBeInTheDocument();
    });
  });
});
