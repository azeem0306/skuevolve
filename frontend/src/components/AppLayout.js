import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Lightbulb, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './AppLayout.css';
import './themeLight.css';

const AppLayout = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`app-layout ${theme === 'light' ? 'theme-light' : ''}`}>
      <header className="app-layout-header">
        <div className="app-layout-brand">
          <div className="app-layout-logo">
            <img
              src={`${process.env.PUBLIC_URL}/favicon.png`}
              alt="SKUEvolve logo"
              className="app-layout-logo-img"
            />
          </div>
          <span className="app-layout-title">SKUEvolve</span>
        </div>

        <nav className="app-layout-nav">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? 'app-layout-link app-layout-link--active' : 'app-layout-link'
            }
            end
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/campaign-planner"
            className={({ isActive }) =>
              isActive ? 'app-layout-link app-layout-link--active' : 'app-layout-link'
            }
          >
            Campaign Planner
          </NavLink>
          <NavLink
            to="/war-room"
            className={({ isActive }) =>
              isActive ? 'app-layout-link app-layout-link--active' : 'app-layout-link'
            }
          >
            War Room
          </NavLink>
        </nav>

        <div className="app-layout-actions">
          <button
            type="button"
            className="app-layout-icon-btn"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
          >
            <Lightbulb size={20} />
          </button>
          <button type="button" className="app-layout-icon-btn" aria-label="Profile">
            <User size={20} />
          </button>
        </div>
      </header>

      <main className="app-layout-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
