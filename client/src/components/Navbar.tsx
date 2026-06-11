import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '0 24px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
      }}>
        <Link to="/" style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#e63946',
          letterSpacing: 1,
        }}>
          MarathonRun
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to="/" style={{ color: '#eee', fontSize: 15, fontWeight: 500 }}>
            赛事列表
          </Link>
          {user ? (
            <>
              <Link to="/profile" style={{ color: '#eee', fontSize: 15, fontWeight: 500 }}>
                个人中心
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" style={{ color: '#f4a261', fontSize: 15, fontWeight: 500 }}>
                  管理后台
                </Link>
              )}
              <span style={{ color: '#aaa', fontSize: 14 }}>
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(230,57,70,0.2)',
                  color: '#e63946',
                  padding: '6px 16px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: '#eee', fontSize: 15, fontWeight: 500 }}>
                登录
              </Link>
              <Link
                to="/signup"
                style={{
                  background: '#e63946',
                  color: 'white',
                  padding: '6px 16px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
