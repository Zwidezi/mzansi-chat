import { MessageSquare, Zap, User, Landmark } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const BottomNav = ({ t }) => {
  return (
    <nav className="bottom-nav">
      <NavLink to="/chats" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <MessageSquare size={24} />
        <span>{t.chats}</span>
      </NavLink>
      <NavLink to="/updates" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Zap size={24} />
        <span>{t.updates}</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <User size={24} />
        <span>{t.profile}</span>
      </NavLink>
      <NavLink to="/savings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Landmark size={24} />
        <span>{t.savings}</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
