import { ArrowLeft, Bell, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = ({ user, t, onLogout, showBack }) => {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {showBack && (
          <button onClick={() => navigate(-1)} className="btn-icon">
            <ArrowLeft size={22} />
          </button>
        )}
        <div className="app-title">MzansiChat</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="btn-icon"><Bell size={20} color="var(--text-muted)" /></button>
        <div className="avatar-header" onClick={() => navigate('/profile')}>
          {user?.profile_pic ? (
             <img src={user.profile_pic} alt="Me" />
          ) : (
             <span className="avatar-initial">{user?.handle?.[0]?.toUpperCase() || "?"}</span>
          )}
        </div>
        <button onClick={onLogout} className="btn-icon"><LogOut size={18} color="var(--danger)" /></button>
      </div>

      <style>{`
        .avatar-header {
          width: 32px;
          height: 32px;
          border-radius: 12px;
          background: var(--surface-light);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          cursor: pointer;
        }
        .avatar-header img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .avatar-initial {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--primary);
        }
        .btn-icon {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          border-radius: 50%;
          transition: background 0.2s;
        }
        .btn-icon:hover {
          background: var(--surface-light);
        }
      `}</style>
    </header>
  );
};

export default Header;
